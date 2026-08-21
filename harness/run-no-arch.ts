import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { buildJudgePrompt } from "./judge-prompt.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const SPEC_PATH = path.join(PROJECT_ROOT, "specs", "functional-only.md");
const TRIALS_DIR = path.join(PROJECT_ROOT, "trials-no-arch");

const MODEL = "claude-sonnet-4-6@default";
const MAX_TOKENS = 16384;
const MAX_TURNS = 50;
const NUM_TRIALS = 3;

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "write_file",
    description:
      "Write content to a file. Creates parent directories if needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Relative file path (e.g., src/server.ts).",
        },
        content: {
          type: "string",
          description: "The full content to write to the file.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "read_file",
    description: "Read the content of a file you previously wrote.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative file path to read." },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List all files in the project directory recursively.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "run_command",
    description:
      "Run a shell command in the project directory. Commands time out after 15 seconds.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "The shell command to run." },
      },
      required: ["command"],
    },
  },
  {
    name: "done",
    description:
      "Signal that you have finished implementing the system. Call this when all files are written and the code compiles.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "Brief summary of what was implemented.",
        },
      },
      required: ["summary"],
    },
  },
];

const SYSTEM_PROMPT = `You are a software engineer implementing a TypeScript project. You have tools to write files, read files, list files, and run shell commands.

Your workflow:
1. Read the requirements carefully
2. Plan your implementation
3. Write each file using the write_file tool
4. After writing all files, create a tsconfig.json and run "npx tsc --noEmit" to check for compilation errors
5. Fix any errors by reading the problematic files and rewriting them
6. Call the "done" tool when everything compiles and is complete

Important:
- Write one file at a time using the write_file tool
- Use ONLY Node.js built-in modules (http, crypto, url, etc.) — no npm packages
- All data storage is in-memory (Maps, arrays)
- The system should be runnable with "npx tsx src/main.ts"
- Include a demo script (src/demo.ts) that starts the server and exercises all features
- After writing all files, always run "npx tsc --noEmit" to verify compilation
- Fix any compilation errors before calling done`;

function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  projectDir: string
): { result: string; error: boolean } {
  switch (toolName) {
    case "write_file": {
      const relPath = toolInput.path as string;
      const content = toolInput.content as string;
      const fullPath = path.join(projectDir, relPath);
      try {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
        return {
          result: `File written: ${relPath} (${content.split("\n").length} lines)`,
          error: false,
        };
      } catch (e: any) {
        return { result: `Error writing file: ${e.message}`, error: true };
      }
    }
    case "read_file": {
      const relPath = toolInput.path as string;
      const fullPath = path.join(projectDir, relPath);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        return { result: content, error: false };
      } catch (e: any) {
        return { result: `Error reading file: ${e.message}`, error: true };
      }
    }
    case "list_files": {
      try {
        const files = listFilesRecursive(projectDir);
        if (files.length === 0) return { result: "No files found.", error: false };
        return { result: files.join("\n"), error: false };
      } catch (e: any) {
        return { result: `Error listing files: ${e.message}`, error: true };
      }
    }
    case "run_command": {
      const command = toolInput.command as string;
      try {
        const output = execSync(command, {
          cwd: projectDir,
          timeout: 15000,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        return { result: output || "(command completed with no output)", error: false };
      } catch (e: any) {
        const stderr = e.stderr || "";
        const stdout = e.stdout || "";
        return {
          result: `Command failed (exit ${e.status}):\n${stdout}\n${stderr}`.trim(),
          error: true,
        };
      }
    }
    case "done":
      return { result: "Implementation complete.", error: false };
    default:
      return { result: `Unknown tool: ${toolName}`, error: true };
  }
}

function listFilesRecursive(dir: string, basePath = ""): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(basePath, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      results.push(...listFilesRecursive(full, rel));
    } else if (entry.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

interface TrialResult {
  trialId: string;
  transcript: {
    messages: any[];
    startTime: string;
    endTime: string;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
}

async function runTrial(
  client: Anthropic,
  trialId: string,
  spec: string,
  outputDir: string
): Promise<TrialResult> {
  const startTime = new Date().toISOString();

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `# Requirements\n\n${spec}\n\n---\n\nImplement this system now. Write each file using the write_file tool. When all files are written and compile cleanly, call the done tool.`,
    },
  ];

  const transcriptMessages: any[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finished = false;

  console.log(`  [${trialId}] Starting multi-turn agent...`);

  for (let turn = 0; turn < MAX_TURNS && !finished; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    const assistantText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolCallRecords: any[] = [];

    if (assistantText) {
      console.log(`  [${trialId}] Turn ${turn + 1}: ${assistantText.slice(0, 100)}...`);
    }

    messages.push({ role: "assistant", content: response.content });

    if (toolUses.length > 0) {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUses) {
        if (tu.name === "done") {
          finished = true;
          console.log(`  [${trialId}] Agent signaled done on turn ${turn + 1}`);
          toolCallRecords.push({
            name: tu.name,
            input: tu.input,
            output: "Implementation complete.",
            error: false,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: "Implementation complete. Good work!",
          });
          break;
        }

        const { result, error } = handleToolCall(
          tu.name,
          tu.input as Record<string, unknown>,
          outputDir
        );

        const truncatedResult =
          result.length > 4000 ? result.slice(0, 4000) + "\n...(truncated)" : result;

        toolCallRecords.push({
          name: tu.name,
          input: tu.input,
          output: truncatedResult,
          error,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: truncatedResult,
          is_error: error,
        });

        if (tu.name === "write_file" && !error) {
          const relPath = (tu.input as Record<string, unknown>).path as string;
          console.log(`  [${trialId}]   wrote: ${relPath}`);
        }
        if (tu.name === "run_command") {
          const cmd = (tu.input as Record<string, unknown>).command as string;
          console.log(
            `  [${trialId}]   ran: ${cmd.slice(0, 60)} → ${error ? "FAIL" : "OK"}`
          );
        }
      }

      messages.push({ role: "user", content: toolResults });

      transcriptMessages.push({
        role: "assistant",
        content: assistantText,
        toolCalls: toolCallRecords,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    } else {
      transcriptMessages.push({
        role: "assistant",
        content: assistantText,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      if (response.stop_reason === "end_turn") {
        console.log(`  [${trialId}] Agent stopped without calling done on turn ${turn + 1}`);
        finished = true;
      }
    }
  }

  if (!finished) {
    console.log(`  [${trialId}] Hit max turns (${MAX_TURNS})`);
  }

  return {
    trialId,
    transcript: {
      messages: transcriptMessages,
      startTime,
      endTime: new Date().toISOString(),
      totalInputTokens,
      totalOutputTokens,
    },
  };
}

function collectTsFiles(dir: string, basePath = ""): Map<string, string> {
  const files = new Map<string, string>();
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(basePath, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      for (const [k, v] of collectTsFiles(full, rel)) files.set(k, v);
    } else if (entry.name.endsWith(".ts")) {
      files.set(rel, fs.readFileSync(full, "utf-8"));
    }
  }
  return files;
}

async function runJudge(
  client: Anthropic,
  trialId: string,
  codeDir: string
): Promise<any> {
  const files: Record<string, string> = {};
  for (const [rel, content] of collectTsFiles(codeDir)) files[rel] = content;

  if (Object.keys(files).length === 0) {
    console.log(`  [judge:${trialId}] No code files found`);
    return {
      trialId,
      specType: "functional-only",
      architecturalAdherence: 0,
      completeness: 0,
      codeQuality: 0,
      constraintCompliance: 0,
      overall: 0,
      notes: "No code files produced",
    };
  }

  const prompt = buildJudgePrompt(files);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in judge response");
    const scores = JSON.parse(jsonMatch[0]);
    const overall =
      (scores.architecturalAdherence +
        scores.completeness +
        scores.codeQuality +
        scores.constraintCompliance) /
      4;

    return {
      trialId,
      specType: "functional-only",
      architecturalAdherence: scores.architecturalAdherence,
      completeness: scores.completeness,
      codeQuality: scores.codeQuality,
      constraintCompliance: scores.constraintCompliance,
      overall: parseFloat(overall.toFixed(2)),
      notes: scores.notes || "",
    };
  } catch (e) {
    console.error(`  [judge:${trialId}] Failed to parse judge response:`, e);
    return {
      trialId,
      specType: "functional-only",
      architecturalAdherence: 0,
      completeness: 0,
      codeQuality: 0,
      constraintCompliance: 0,
      overall: 0,
      notes: `Parse error: ${text.slice(0, 200)}`,
    };
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const spec = fs.readFileSync(SPEC_PATH, "utf-8");

  fs.mkdirSync(TRIALS_DIR, { recursive: true });

  for (let i = 1; i <= NUM_TRIALS; i++) {
    const trialId = `functional-only-${i}`;
    const outputDir = path.join(TRIALS_DIR, trialId, "code");

    // Skip completed trials
    const judgePath = path.join(TRIALS_DIR, trialId, "judge-score.json");
    if (fs.existsSync(judgePath)) {
      console.log(`\n=== Skipping ${trialId} (already complete) ===`);
      continue;
    }

    console.log(`\n=== Running trial: ${trialId} ===`);

    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      const result = await runTrial(client, trialId, spec, outputDir);

      // Save transcript
      const transcriptPath = path.join(TRIALS_DIR, trialId, "transcript.json");
      fs.writeFileSync(transcriptPath, JSON.stringify(result.transcript, null, 2));

      const totalTokens =
        result.transcript.totalInputTokens + result.transcript.totalOutputTokens;
      console.log(`  [${trialId}] Tokens: ${totalTokens} total`);

      // Run judge
      console.log(`  [${trialId}] Running judge...`);
      const judgeScore = await runJudge(client, trialId, outputDir);

      fs.writeFileSync(judgePath, JSON.stringify(judgeScore, null, 2));
      console.log(
        `  [${trialId}] Judge: arch=${judgeScore.architecturalAdherence} comp=${judgeScore.completeness} qual=${judgeScore.codeQuality} constr=${judgeScore.constraintCompliance} overall=${judgeScore.overall}`
      );
    } catch (error) {
      console.error(`  [${trialId}] FAILED:`, error);
    }
  }

  // Summary
  console.log("\n=== No-Architecture Baseline Summary ===");
  for (let i = 1; i <= NUM_TRIALS; i++) {
    const trialId = `functional-only-${i}`;
    const judgePath = path.join(TRIALS_DIR, trialId, "judge-score.json");
    if (fs.existsSync(judgePath)) {
      const score = JSON.parse(fs.readFileSync(judgePath, "utf-8"));
      console.log(
        `  ${trialId}: arch=${score.architecturalAdherence} comp=${score.completeness} qual=${score.codeQuality} constr=${score.constraintCompliance} overall=${score.overall}`
      );
    }
  }
}

main().catch(console.error);
