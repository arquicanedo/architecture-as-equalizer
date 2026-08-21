import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { TrialTranscript } from "./types.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");

interface TrialStats {
  trialId: string;
  model: string;
  specType: string;
  turns: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  fileWrites: number;
  fileReads: number;
  fileRewrites: number;
  tscAttempts: number;
  tscPasses: number;
  tscFails: number;
  demoAttempts: number;
  demoPasses: number;
  demoFails: number;
  otherCommands: number;
  otherCommandFails: number;
  toolErrors: number;
  constraintViolations: number;
  totalFiles: number;
  totalLines: number;
  judgeArch: number;
  judgeComp: number;
  judgeQual: number;
  judgeConstr: number;
  judgeOverall: number;
  hitMaxTurns: boolean;
  durationMs: number;
}

function analyzeTranscript(transcript: TrialTranscript): Partial<TrialStats> {
  let fileWrites = 0, fileReads = 0, tscPasses = 0, tscFails = 0;
  let demoPasses = 0, demoFails = 0, otherCommands = 0, otherCommandFails = 0;
  let toolErrors = 0;
  const writtenPaths = new Set<string>();
  let fileRewrites = 0;

  for (const msg of transcript.messages) {
    if (!msg.toolCalls) continue;
    for (const tc of msg.toolCalls) {
      if (tc.error) toolErrors++;

      if (tc.name === "write_file" && !tc.error) {
        const p = (tc.input as any).path as string;
        if (writtenPaths.has(p)) fileRewrites++;
        else writtenPaths.add(p);
        fileWrites++;
      }
      if (tc.name === "read_file") fileReads++;
      if (tc.name === "run_command") {
        const cmd = JSON.stringify(tc.input).toLowerCase();
        if (cmd.includes("tsc")) {
          if (tc.error) tscFails++; else tscPasses++;
        } else if (cmd.includes("demo") || cmd.includes("main.ts")) {
          if (tc.error) demoFails++; else demoPasses++;
        } else {
          if (tc.error) otherCommandFails++; else otherCommands++;
        }
      }
    }
  }

  return {
    turns: transcript.messages.length,
    totalTokens: transcript.totalInputTokens + transcript.totalOutputTokens,
    inputTokens: transcript.totalInputTokens,
    outputTokens: transcript.totalOutputTokens,
    fileWrites,
    fileReads,
    fileRewrites,
    tscAttempts: tscPasses + tscFails,
    tscPasses,
    tscFails,
    demoAttempts: demoPasses + demoFails,
    demoPasses,
    demoFails,
    otherCommands,
    otherCommandFails,
    toolErrors,
  };
}

function loadTrialStats(trialsDir: string, modelName: string): TrialStats[] {
  const stats: TrialStats[] = [];
  if (!fs.existsSync(trialsDir)) return stats;

  const dirs = fs.readdirSync(trialsDir, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name).sort();

  for (const trialName of dirs) {
    const trialDir = path.join(trialsDir, trialName);
    const transcriptPath = path.join(trialDir, "transcript.json");
    const analysisPath = path.join(trialDir, "analysis.json");
    const judgePath = path.join(trialDir, "judge-score.json");

    if (!fs.existsSync(transcriptPath)) continue;

    const transcript: TrialTranscript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
    const transcriptStats = analyzeTranscript(transcript);

    let analysis: any = {};
    if (fs.existsSync(analysisPath)) {
      analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
    }

    let judge: any = {};
    if (fs.existsSync(judgePath)) {
      judge = JSON.parse(fs.readFileSync(judgePath, "utf-8"));
    }

    const start = new Date(transcript.startTime).getTime();
    const end = new Date(transcript.endTime).getTime();

    stats.push({
      trialId: trialName,
      model: modelName,
      specType: trialName.replace(/-\d+$/, ""),
      ...transcriptStats,
      constraintViolations: analysis.constraints?.totalViolations ?? 0,
      totalFiles: analysis.codeMetrics?.totalFiles ?? 0,
      totalLines: analysis.codeMetrics?.totalLines ?? 0,
      judgeArch: judge.architecturalAdherence ?? 0,
      judgeComp: judge.completeness ?? 0,
      judgeQual: judge.codeQuality ?? 0,
      judgeConstr: judge.constraintCompliance ?? 0,
      judgeOverall: judge.overall ?? 0,
      hitMaxTurns: transcript.messages.length >= 50,
      durationMs: end - start,
    } as TrialStats);
  }

  return stats;
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1));
}

function main() {
  const modelDirs: Array<{ dir: string; model: string }> = [
    { dir: "trials", model: "Sonnet 4.6" },
    { dir: "trials-haiku", model: "Haiku 4.5" },
    { dir: "trials-gpt-5-mini", model: "GPT-5-mini" },
    { dir: "trials-gpt-5", model: "GPT-5" },
    { dir: "trials-gemini-25-flash", model: "Gemini 2.5 Flash" },
    { dir: "trials-gemini-25-pro", model: "Gemini 2.5 Pro" },
  ];

  const allStats: TrialStats[] = [];

  for (const { dir, model } of modelDirs) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    const stats = loadTrialStats(fullDir, model);
    allStats.push(...stats);
    if (stats.length > 0) {
      console.log(`Loaded ${stats.length} trials for ${model}`);
    }
  }

  if (allStats.length === 0) {
    console.error("No trial data found");
    process.exit(1);
  }

  // Group by model
  const models = [...new Set(allStats.map(s => s.model))];
  const specTypes = [...new Set(allStats.map(s => s.specType))].sort();

  // === Report 1: Process Metrics by Model ===
  console.log("\n" + "=".repeat(80));
  console.log("REPORT 1: PROCESS METRICS BY MODEL (mean across all conditions)");
  console.log("=".repeat(80));

  const header = ["Metric", ...models].map(s => s.padEnd(18)).join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  const processMetrics: Array<{ label: string; fn: (s: TrialStats) => number }> = [
    { label: "Agent Turns", fn: s => s.turns },
    { label: "File Writes", fn: s => s.fileWrites },
    { label: "File Rewrites", fn: s => s.fileRewrites },
    { label: "TSC Attempts", fn: s => s.tscAttempts },
    { label: "TSC Failures", fn: s => s.tscFails },
    { label: "TSC Pass Rate %", fn: s => s.tscAttempts > 0 ? (s.tscPasses / s.tscAttempts) * 100 : 0 },
    { label: "Demo Attempts", fn: s => s.demoAttempts },
    { label: "Demo Failures", fn: s => s.demoFails },
    { label: "Demo Run Rate %", fn: s => s.demoAttempts > 0 ? 100 : 0 },
    { label: "Tool Errors", fn: s => s.toolErrors },
    { label: "Total Tokens (K)", fn: s => s.totalTokens / 1000 },
    { label: "Lines of Code", fn: s => s.totalLines },
    { label: "Hit Max Turns %", fn: s => s.hitMaxTurns ? 100 : 0 },
    { label: "Judge Overall", fn: s => s.judgeOverall },
    { label: "Violations", fn: s => s.constraintViolations },
  ];

  for (const m of processMetrics) {
    const vals = models.map(model => {
      const trials = allStats.filter(s => s.model === model);
      return mean(trials.map(m.fn)).toFixed(1);
    });
    console.log([m.label.padEnd(18), ...vals.map(v => v.padEnd(18))].join(" | "));
  }

  // === Report 2: Process Metrics by Model × Format ===
  console.log("\n" + "=".repeat(80));
  console.log("REPORT 2: KEY METRICS BY MODEL × FORMAT");
  console.log("=".repeat(80));

  for (const metric of [
    { label: "Judge Overall", fn: (s: TrialStats) => s.judgeOverall },
    { label: "TSC Failures", fn: (s: TrialStats) => s.tscFails },
    { label: "Demo Run Rate", fn: (s: TrialStats) => s.demoAttempts > 0 ? 1 : 0 },
    { label: "Violations", fn: (s: TrialStats) => s.constraintViolations },
    { label: "Agent Turns", fn: (s: TrialStats) => s.turns },
    { label: "File Rewrites", fn: (s: TrialStats) => s.fileRewrites },
  ]) {
    console.log(`\n--- ${metric.label} ---`);
    const header2 = ["Format", ...models].map(s => s.padEnd(16)).join(" | ");
    console.log(header2);
    console.log("-".repeat(header2.length));

    for (const spec of specTypes) {
      const vals = models.map(model => {
        const trials = allStats.filter(s => s.model === model && s.specType === spec);
        if (trials.length === 0) return "—";
        return mean(trials.map(metric.fn)).toFixed(2);
      });
      console.log([spec.padEnd(16), ...vals.map(v => v.padEnd(16))].join(" | "));
    }
  }

  // === Report 3: Debugging Effort (rewrites as % of total writes) ===
  console.log("\n" + "=".repeat(80));
  console.log("REPORT 3: DEBUGGING EFFORT — REWRITE RATE (rewrites / total writes)");
  console.log("=".repeat(80));

  const header3 = ["Format", ...models].map(s => s.padEnd(16)).join(" | ");
  console.log(header3);
  console.log("-".repeat(header3.length));

  for (const spec of specTypes) {
    const vals = models.map(model => {
      const trials = allStats.filter(s => s.model === model && s.specType === spec);
      if (trials.length === 0) return "—";
      const totalWrites = trials.reduce((a, s) => a + s.fileWrites, 0);
      const totalRewrites = trials.reduce((a, s) => a + s.fileRewrites, 0);
      return totalWrites > 0 ? ((totalRewrites / totalWrites) * 100).toFixed(1) + "%" : "0%";
    });
    console.log([spec.padEnd(16), ...vals.map(v => v.padEnd(16))].join(" | "));
  }

  // === Report 4: Format Effect Size by Model ===
  console.log("\n" + "=".repeat(80));
  console.log("REPORT 4: FORMAT EFFECT SIZE — (best format - prose) per model");
  console.log("=".repeat(80));

  for (const model of models) {
    const modelTrials = allStats.filter(s => s.model === model);
    const proseTrials = modelTrials.filter(s => s.specType === "prose");
    const proseMean = mean(proseTrials.map(s => s.judgeOverall));

    let bestSpec = "prose";
    let bestDelta = 0;

    for (const spec of specTypes) {
      if (spec === "prose") continue;
      const specTrials = modelTrials.filter(s => s.specType === spec);
      if (specTrials.length === 0) continue;
      const specMean = mean(specTrials.map(s => s.judgeOverall));
      const delta = specMean - proseMean;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestSpec = spec;
      }
    }

    const allMeans = specTypes.map(spec => {
      const trials = modelTrials.filter(s => s.specType === spec);
      return { spec, mean: trials.length > 0 ? mean(trials.map(s => s.judgeOverall)) : 0 };
    }).filter(x => x.mean > 0);

    const spread = allMeans.length > 0
      ? Math.max(...allMeans.map(x => x.mean)) - Math.min(...allMeans.map(x => x.mean))
      : 0;

    console.log(`${model}: prose=${proseMean.toFixed(2)}, best=${bestSpec} (+${bestDelta.toFixed(2)}), spread=${spread.toFixed(2)}`);
  }

  // Write raw CSV
  const csvPath = path.join(PROJECT_ROOT, "results", "all-trials-stats.csv");
  const csvHeader = Object.keys(allStats[0]).join(",");
  const csvRows = allStats.map(s => Object.values(s).join(","));
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join("\n"));
  console.log(`\nRaw CSV written to ${csvPath} (${allStats.length} rows)`);
}

main();
