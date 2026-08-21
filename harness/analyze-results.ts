import * as fs from "fs";
import * as path from "path";
import {
  AnalysisResult,
  StructuralAnalysis,
  ConstraintAnalysis,
  ConstraintViolation,
  CodeMetrics,
  TranscriptMetrics,
  TrialTranscript,
  SpecType,
} from "./types.js";

const SERVICE_FILES = [
  "user-service",
  "project-service",
  "task-service",
  "comment-service",
  "notification-service",
];

export function analyzeTrialOutput(
  trialId: string,
  specType: SpecType,
  codeDir: string,
  transcript: TrialTranscript
): AnalysisResult {
  const files = collectTypeScriptFiles(codeDir);

  return {
    trialId,
    specType,
    structural: analyzeStructure(codeDir, files),
    constraints: analyzeConstraints(files),
    codeMetrics: analyzeCodeMetrics(codeDir, files),
    transcriptMetrics: analyzeTranscript(transcript),
  };
}

function collectTypeScriptFiles(
  dir: string,
  basePath = ""
): Map<string, string> {
  const files = new Map<string, string>();
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(basePath, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      for (const [k, v] of collectTypeScriptFiles(full, rel)) {
        files.set(k, v);
      }
    } else if (entry.name.endsWith(".ts")) {
      files.set(rel, fs.readFileSync(full, "utf-8"));
    }
  }
  return files;
}

function analyzeStructure(
  codeDir: string,
  files: Map<string, string>
): StructuralAnalysis {
  const fileNames = Array.from(files.keys()).map((f) => f.toLowerCase());
  const details: string[] = [];
  let folderStructureScore = 0;

  const hasEventBus = fileNames.some((f) => f.includes("event-bus") || f.includes("eventbus") || f.includes("event_bus"));
  const hasUserService = fileNames.some((f) => f.includes("user"));
  const hasProjectService = fileNames.some((f) => f.includes("project"));
  const hasTaskService = fileNames.some((f) => f.includes("task"));
  const hasCommentService = fileNames.some((f) => f.includes("comment"));
  const hasNotificationService = fileNames.some((f) => f.includes("notif"));
  const hasRouter = fileNames.some((f) => f.includes("router") || f.includes("routes"));
  const hasMainEntry = fileNames.some((f) => f.includes("main") || f.includes("index") || f.includes("app") || f.includes("server"));
  const hasDemoScript = fileNames.some((f) => f.includes("demo") || f.includes("test") || f.includes("example"));

  const components = [
    ["Event Bus", hasEventBus],
    ["User Service", hasUserService],
    ["Project Service", hasProjectService],
    ["Task Service", hasTaskService],
    ["Comment Service", hasCommentService],
    ["Notification Service", hasNotificationService],
    ["Router", hasRouter],
    ["Main Entry", hasMainEntry],
    ["Demo Script", hasDemoScript],
  ] as const;

  for (const [name, present] of components) {
    if (present) {
      folderStructureScore += 1;
    } else {
      details.push(`Missing: ${name}`);
    }
  }

  // Check for service separation (each in own file)
  const serviceInOwnFile = SERVICE_FILES.every((svc) =>
    fileNames.some((f) => f.includes(svc.replace("-service", "")))
  );
  if (serviceInOwnFile) {
    folderStructureScore += 1;
    details.push("Each service in its own file: YES");
  } else {
    details.push("Each service in its own file: NO — some services may be combined");
  }

  return {
    hasEventBus,
    hasUserService,
    hasProjectService,
    hasTaskService,
    hasCommentService,
    hasNotificationService,
    hasRouter,
    hasMainEntry,
    hasDemoScript,
    fileCount: files.size,
    folderStructureScore: Math.round((folderStructureScore / 10) * 10),
    details,
  };
}

function analyzeConstraints(files: Map<string, string>): ConstraintAnalysis {
  const violations: {
    directServiceCalls: ConstraintViolation[];
    sharedDataAccess: ConstraintViolation[];
    httpInServices: ConstraintViolation[];
    invalidStatusTransitions: ConstraintViolation[];
    externalDependencies: ConstraintViolation[];
  } = {
    directServiceCalls: [],
    sharedDataAccess: [],
    httpInServices: [],
    invalidStatusTransitions: [],
    externalDependencies: [],
  };

  for (const [filePath, content] of files) {
    const lines = content.split("\n");
    const fileNameLower = filePath.toLowerCase();

    const isService = SERVICE_FILES.some((s) =>
      fileNameLower.includes(s.replace("-service", ""))
    );
    const isRouter = fileNameLower.includes("router") || fileNameLower.includes("routes");
    const isMain = fileNameLower.includes("main") || fileNameLower.includes("index") || fileNameLower.includes("app");
    const isEventBus = fileNameLower.includes("event-bus") || fileNameLower.includes("eventbus");
    const isDemo = fileNameLower.includes("demo") || fileNameLower.includes("test");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Constraint 1: No direct service-to-service imports
      if (isService && !isEventBus) {
        const importMatch = line.match(/import\s+.*from\s+['"](.+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1].toLowerCase();
          const importedService = SERVICE_FILES.find(
            (s) =>
              importPath.includes(s.replace("-service", "")) &&
              !fileNameLower.includes(s.replace("-service", ""))
          );
          if (
            importedService &&
            !importPath.includes("event-bus") &&
            !importPath.includes("eventbus") &&
            !importPath.includes("type")
          ) {
            violations.directServiceCalls.push({
              type: "direct-service-import",
              file: filePath,
              line: lineNum,
              description: `Service file imports another service: ${importedService}`,
            });
          }
        }
      }

      // Constraint 3: HTTP handling only in router
      if (isService && !isRouter && !isMain && !isDemo) {
        if (
          line.includes("http.createServer") ||
          line.includes("req.url") ||
          line.includes("res.writeHead") ||
          line.includes("res.end(") ||
          line.includes("IncomingMessage") ||
          line.includes("ServerResponse")
        ) {
          violations.httpInServices.push({
            type: "http-in-service",
            file: filePath,
            line: lineNum,
            description: `Service file contains HTTP handling code`,
          });
        }
      }

      // Constraint 4: Status transition validation (check for backward transitions being allowed)
      if (fileNameLower.includes("task")) {
        if (
          line.includes('"done"') &&
          (line.includes('"todo"') || line.includes('"in-progress"'))
        ) {
          // This is likely a status transition check — we'll flag if it seems to allow backward
          // More nuanced check: if it's in an "allowed transitions" map
          // We'll check if backward transitions are explicitly allowed
        }
      }

      // Constraint 5: External dependencies
      if (line.match(/import\s+.*from\s+['"](?!\.)/)) {
        const importMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          const pkg = importMatch[1];
          const allowedBuiltins = [
            "http",
            "https",
            "fs",
            "path",
            "url",
            "events",
            "util",
            "stream",
            "querystring",
            "crypto",
            "os",
            "child_process",
            "node:http",
            "node:https",
            "node:fs",
            "node:path",
            "node:url",
            "node:events",
            "node:util",
            "node:stream",
            "node:querystring",
            "node:crypto",
          ];
          if (
            !allowedBuiltins.includes(pkg) &&
            !pkg.startsWith(".") &&
            !pkg.startsWith("node:")
          ) {
            violations.externalDependencies.push({
              type: "external-dependency",
              file: filePath,
              line: lineNum,
              description: `Uses external package: ${pkg}`,
            });
          }
        }
      }
    }

    // Constraint 2: Shared data access (check if services export their store and others import it)
    if (isService) {
      const exportsStore =
        content.includes("export const store") ||
        content.includes("export let store") ||
        content.includes("export const data") ||
        content.includes("export const users") ||
        content.includes("export const tasks") ||
        content.includes("export const projects") ||
        content.includes("export const comments") ||
        content.includes("export const notifications");

      if (exportsStore) {
        violations.sharedDataAccess.push({
          type: "exported-data-store",
          file: filePath,
          line: 0,
          description: `Service exports its internal data store, enabling shared access`,
        });
      }
    }
  }

  return {
    ...violations,
    totalViolations:
      violations.directServiceCalls.length +
      violations.sharedDataAccess.length +
      violations.httpInServices.length +
      violations.invalidStatusTransitions.length +
      violations.externalDependencies.length,
  };
}

function analyzeCodeMetrics(
  codeDir: string,
  files: Map<string, string>
): CodeMetrics {
  const linesPerFile: Record<string, number> = {};
  let totalLines = 0;

  for (const [filePath, content] of files) {
    const lineCount = content.split("\n").length;
    linesPerFile[filePath] = lineCount;
    totalLines += lineCount;
  }

  return {
    compiles: false, // Will be set by the runner after tsc check
    compilationErrors: [],
    totalLines,
    totalFiles: files.size,
    linesPerFile,
  };
}

function analyzeTranscript(transcript: TrialTranscript): TranscriptMetrics {
  let toolCallCount = 0;
  let errorCount = 0;
  let retryCount = 0;

  for (const msg of transcript.messages) {
    if (msg.toolCalls) {
      toolCallCount += msg.toolCalls.length;
      for (const tc of msg.toolCalls) {
        if (tc.error) errorCount++;
      }
    }
    if (
      msg.role === "assistant" &&
      (msg.content.includes("let me try again") ||
        msg.content.includes("let me fix") ||
        msg.content.includes("I need to correct") ||
        msg.content.includes("that was wrong"))
    ) {
      retryCount++;
    }
  }

  const start = new Date(transcript.startTime).getTime();
  const end = new Date(transcript.endTime).getTime();

  return {
    totalInputTokens: transcript.totalInputTokens,
    totalOutputTokens: transcript.totalOutputTokens,
    totalTokens: transcript.totalInputTokens + transcript.totalOutputTokens,
    messageCount: transcript.messages.length,
    toolCallCount,
    errorCount,
    retryCount,
    durationMs: end - start,
  };
}

export function generateComparisonReport(
  results: AnalysisResult[],
  judgeScores: Array<{
    trialId: string;
    specType: string;
    architecturalAdherence: number;
    completeness: number;
    codeQuality: number;
    constraintCompliance: number;
    overall: number;
    notes: string;
  }>
): string {
  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "N/A";
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const specTypes = [...new Set(results.map((r) => r.specType))].sort();
  const grouped: Record<string, AnalysisResult[]> = {};
  for (const st of specTypes) {
    grouped[st] = results.filter((r) => r.specType === st);
  }
  const judgeGrouped: Record<string, typeof judgeScores> = {};
  for (const st of specTypes) {
    judgeGrouped[st] = judgeScores.filter((s) => s.specType === st);
  }

  const trialsPerCondition = Math.max(...Object.values(grouped).map((g: AnalysisResult[]) => g.length));

  let report = `# Experiment Results: Architecture Specification Format Comparison\n\n`;
  report += `**Date:** ${new Date().toISOString().split("T")[0]}\n`;
  report += `**Conditions:** ${specTypes.length} (${specTypes.join(", ")})\n`;
  report += `**Trials per condition:** ${trialsPerCondition}\n\n`;

  // Summary table
  report += `## Summary Table\n\n`;
  report += `| Metric | ${specTypes.join(" | ")} |\n`;
  report += `|--------| ${specTypes.map(() => "---").join(" | ")} |\n`;

  const metrics: Array<{ label: string; fn: (r: AnalysisResult) => number }> = [
    { label: "Constraint Violations", fn: (r) => r.constraints.totalViolations },
    { label: "Total Tokens", fn: (r) => r.transcriptMetrics.totalTokens },
    { label: "Lines of Code", fn: (r) => r.codeMetrics.totalLines },
    { label: "File Count", fn: (r) => r.codeMetrics.totalFiles },
    { label: "Tool Call Errors", fn: (r) => r.transcriptMetrics.errorCount },
    { label: "Agent Turns", fn: (r) => r.transcriptMetrics.messageCount },
  ];

  for (const m of metrics) {
    const vals = specTypes.map((st) => avg(grouped[st].map(m.fn)));
    report += `| ${m.label} | ${vals.join(" | ")} |\n`;
  }

  // Judge scores
  report += `\n## Judge Scores (1-10)\n\n`;
  report += `| Dimension | ${specTypes.join(" | ")} |\n`;
  report += `|-----------| ${specTypes.map(() => "---").join(" | ")} |\n`;

  for (const dim of [
    "architecturalAdherence",
    "completeness",
    "codeQuality",
    "constraintCompliance",
    "overall",
  ] as const) {
    const vals = specTypes.map((st) =>
      avg(judgeGrouped[st].map((s) => s[dim]))
    );
    report += `| ${dim} | ${vals.join(" | ")} |\n`;
  }

  // Per-trial details
  report += `\n## Per-Trial Details\n\n`;

  for (const st of specTypes) {
    report += `### Condition: ${st}\n\n`;
    for (const result of grouped[st]) {
      report += `#### ${result.trialId}\n`;
      report += `- Files: ${result.codeMetrics.totalFiles}, Lines: ${result.codeMetrics.totalLines}\n`;
      report += `- Compiles: ${result.codeMetrics.compiles ? "YES" : "NO"}\n`;
      report += `- Constraint violations: ${result.constraints.totalViolations}\n`;
      if (result.constraints.totalViolations > 0) {
        const allViolations = [
          ...result.constraints.directServiceCalls,
          ...result.constraints.sharedDataAccess,
          ...result.constraints.httpInServices,
          ...result.constraints.invalidStatusTransitions,
          ...result.constraints.externalDependencies,
        ];
        for (const v of allViolations) {
          report += `  - [${v.type}] ${v.file}:${v.line} — ${v.description}\n`;
        }
      }
      report += `- Tokens: ${result.transcriptMetrics.totalTokens} (in: ${result.transcriptMetrics.totalInputTokens}, out: ${result.transcriptMetrics.totalOutputTokens})\n`;
      report += `- Tool calls: ${result.transcriptMetrics.toolCallCount}, Errors: ${result.transcriptMetrics.errorCount}, Retries: ${result.transcriptMetrics.retryCount}\n`;
      report += `- Structure score: ${result.structural.folderStructureScore}/10\n`;

      const judge = judgeScores.find((s) => s.trialId === result.trialId);
      if (judge) {
        report += `- Judge: arch=${judge.architecturalAdherence} comp=${judge.completeness} quality=${judge.codeQuality} constraints=${judge.constraintCompliance} overall=${judge.overall}\n`;
        report += `- Judge notes: ${judge.notes}\n`;
      }
      report += `\n`;
    }
  }

  // Constraint violation breakdown
  report += `## Constraint Violation Breakdown\n\n`;
  report += `| Type | ${specTypes.join(" | ")} |\n`;
  report += `|------| ${specTypes.map(() => "---").join(" | ")} |\n`;
  for (const type of [
    "directServiceCalls",
    "sharedDataAccess",
    "httpInServices",
    "invalidStatusTransitions",
    "externalDependencies",
  ] as const) {
    const vals = specTypes.map((st) =>
      sum(grouped[st].map((r) => r.constraints[type].length)).toString()
    );
    report += `| ${type} | ${vals.join(" | ")} |\n`;
  }

  return report;
}
