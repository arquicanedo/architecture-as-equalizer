import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { TrialConfig, TrialTranscript, ToolCall, AnalysisResult, JudgeScore, SpecType } from "./types.js";
import { analyzeTrialOutput, generateComparisonReport } from "./analyze-results.js";
import { buildJudgePrompt } from "./judge-prompt.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const SPECS_DIR = path.join(PROJECT_ROOT, "specs");
const TRIALS_DIR_BASE = path.join(PROJECT_ROOT, `trials-${process.env.OPENAI_MODEL?.replace(/[^a-zA-Z0-9-]/g, "") || "gpt-5-mini"}`);
const RESULTS_DIR_BASE = path.join(PROJECT_ROOT, `results-${process.env.OPENAI_MODEL?.replace(/[^a-zA-Z0-9-]/g, "") || "gpt-5-mini"}`);
const TRIALS_DIR = TRIALS_DIR_BASE;
const RESULTS_DIR = RESULTS_DIR_BASE;

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const MODEL_LABEL = MODEL.replace(/[^a-zA-Z0-9-]/g, "");
const JUDGE_MODEL = "claude-sonnet-4-6@default";
const MAX_TOKENS = 16384;
const MAX_TURNS = 50;

interface FunctionToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file. Creates parent directories if needed.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path (e.g., src/event-bus.ts)." },
          content: { type: "string", description: "The full content to write to the file." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the content of a file you previously wrote.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Relative file path to read." } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files in the project directory recursively.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command in the project directory. Commands time out after 15 seconds.",
      parameters: {
        type: "object",
        properties: { command: { type: "string", description: "The shell command to run." } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "done",
      description: "Signal that you have finished implementing the system.",
      parameters: {
        type: "object",
        properties: { summary: { type: "string", description: "Brief summary of what was implemented." } },
        required: ["summary"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are a software engineer implementing a TypeScript project. You have tools to write files, read files, list files, and run shell commands.

Your workflow:
1. Read the architecture specification carefully
2. Plan your implementation
3. Write each file using the write_file tool
4. After writing all files, create a tsconfig.json and run "npx tsc --noEmit" to check for compilation errors
5. Fix any errors by reading the problematic files and rewriting them
6. Call the "done" tool when everything compiles and is complete

Important:
- Write one file at a time using the write_file tool
- Each service should be in its own file
- Use ONLY Node.js built-in modules (http, crypto, url, etc.) — no npm packages
- All data storage is in-memory (Maps, arrays)
- The system should be runnable with "npx tsx src/main.ts"
- Include a demo script (src/demo.ts) that starts the server and exercises all features
- After writing all files, always run "npx tsc --noEmit" to verify compilation
- Fix any compilation errors before calling done`;

function handleToolCall(
  toolName: string,
  toolArgs: string,
  projectDir: string
): { result: string; error: boolean } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(toolArgs);
  } catch {
    return { result: `Invalid JSON arguments: ${toolArgs.slice(0, 200)}`, error: true };
  }

  switch (toolName) {
    case "write_file": {
      const relPath = parsed.path as string;
      const content = parsed.content as string;
      const fullPath = path.join(projectDir, relPath);
      try {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
        return { result: `File written: ${relPath} (${content.split("\n").length} lines)`, error: false };
      } catch (e: any) {
        return { result: `Error writing file: ${e.message}`, error: true };
      }
    }
    case "read_file": {
      const relPath = parsed.path as string;
      const fullPath = path.join(projectDir, relPath);
      try {
        return { result: fs.readFileSync(fullPath, "utf-8"), error: false };
      } catch (e: any) {
        return { result: `Error reading file: ${e.message}`, error: true };
      }
    }
    case "list_files": {
      try {
        const files = listFilesRecursive(projectDir);
        return { result: files.length === 0 ? "No files found." : files.join("\n"), error: false };
      } catch (e: any) {
        return { result: `Error listing files: ${e.message}`, error: true };
      }
    }
    case "run_command": {
      const command = parsed.command as string;
      try {
        const output = execSync(command, { cwd: projectDir, timeout: 15000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
        return { result: output || "(command completed with no output)", error: false };
      } catch (e: any) {
        return { result: `Command failed (exit ${e.status}):\n${e.stdout || ""}\n${e.stderr || ""}`.trim(), error: true };
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

async function runTrial(client: OpenAI, config: TrialConfig): Promise<{ transcript: TrialTranscript }> {
  const spec = fs.readFileSync(config.specPath, "utf-8");
  const startTime = new Date().toISOString();

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `# Architecture Specification\n\n${spec}\n\n---\n\nImplement this system now. Write each file using the write_file tool. When all files are written and compile cleanly, call the done tool.` },
  ];

  const transcriptMessages: TrialTranscript["messages"] = [];
  let totalInputTokens = 0, totalOutputTokens = 0, finished = false;

  console.log(`  [${config.id}] Starting multi-turn agent (${MODEL})...`);

  for (let turn = 0; turn < MAX_TURNS && !finished; turn++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_TOKENS,
      messages,
      tools: TOOLS,
    });

    const choice = response.choices[0];
    const usage = response.usage;
    if (usage) {
      totalInputTokens += usage.prompt_tokens;
      totalOutputTokens += usage.completion_tokens;
    }

    const assistantMsg = choice.message;
    const assistantText = assistantMsg.content || "";
    const toolCalls = assistantMsg.tool_calls || [];
    const toolCallRecords: ToolCall[] = [];

    if (assistantText) {
      console.log(`  [${config.id}] Turn ${turn + 1}: ${assistantText.slice(0, 100)}...`);
    }

    messages.push(assistantMsg);

    if (toolCalls.length > 0) {
      for (const rawTc of toolCalls) {
        const tc = rawTc as FunctionToolCall;
        if (!tc.function) continue;
        const fnName = tc.function.name;
        const fnArgs = tc.function.arguments;

        if (fnName === "done") {
          finished = true;
          console.log(`  [${config.id}] Agent signaled done on turn ${turn + 1}`);
          toolCallRecords.push({ name: fnName, input: JSON.parse(fnArgs || "{}"), output: "Implementation complete.", error: false });
          messages.push({ role: "tool", tool_call_id: tc.id, content: "Implementation complete. Good work!" });
          break;
        }

        const { result, error } = handleToolCall(fnName, fnArgs, config.outputDir);
        const truncatedResult = result.length > 4000 ? result.slice(0, 4000) + "\n...(truncated)" : result;

        toolCallRecords.push({
          name: fnName,
          input: JSON.parse(fnArgs || "{}"),
          output: truncatedResult,
          error,
        });

        messages.push({ role: "tool", tool_call_id: tc.id, content: truncatedResult });

        if (fnName === "write_file" && !error) {
          const parsed = JSON.parse(fnArgs);
          console.log(`  [${config.id}]   wrote: ${parsed.path}`);
        }
        if (fnName === "run_command") {
          const parsed = JSON.parse(fnArgs);
          console.log(`  [${config.id}]   ran: ${(parsed.command as string).slice(0, 60)} → ${error ? "FAIL" : "OK"}`);
        }
      }

      transcriptMessages.push({
        role: "assistant",
        content: assistantText,
        toolCalls: toolCallRecords,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
      });
    } else {
      transcriptMessages.push({
        role: "assistant",
        content: assistantText,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
      });

      if (choice.finish_reason === "stop") {
        console.log(`  [${config.id}] Agent stopped without calling done on turn ${turn + 1}`);
        finished = true;
      }
    }
  }

  if (!finished) console.log(`  [${config.id}] Hit max turns (${MAX_TURNS})`);

  return {
    transcript: {
      trialId: config.id,
      specType: config.specType,
      messages: transcriptMessages,
      startTime,
      endTime: new Date().toISOString(),
      totalInputTokens,
      totalOutputTokens,
    },
  };
}

async function runJudge(
  client: Anthropic,
  trialId: string,
  specType: SpecType,
  codeDir: string
): Promise<JudgeScore> {
  const files: Record<string, string> = {};
  for (const [rel, content] of collectTsFiles(codeDir)) files[rel] = content;
  if (Object.keys(files).length === 0) {
    console.log(`  [judge:${trialId}] No code files found`);
    return { trialId, specType, architecturalAdherence: 0, completeness: 0, codeQuality: 0, constraintCompliance: 0, overall: 0, notes: "No code files produced" };
  }
  const response = await client.messages.create({ model: JUDGE_MODEL, max_tokens: 4096, messages: [{ role: "user", content: buildJudgePrompt(files) }] });
  const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const scores = JSON.parse(jsonMatch[0]);
    const overall = (scores.architecturalAdherence + scores.completeness + scores.codeQuality + scores.constraintCompliance) / 4;
    return { trialId, specType, ...scores, overall: parseFloat(overall.toFixed(2)), notes: scores.notes || "" };
  } catch (e) {
    console.error(`  [judge:${trialId}] Parse error:`, e);
    return { trialId, specType, architecturalAdherence: 0, completeness: 0, codeQuality: 0, constraintCompliance: 0, overall: 0, notes: `Parse error: ${text.slice(0, 200)}` };
  }
}

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!openaiKey) { console.error("OPENAI_API_KEY required"); process.exit(1); }
  if (!anthropicKey) { console.error("ANTHROPIC_API_KEY required (for judge)"); process.exit(1); }

  const openaiClient = new OpenAI({ apiKey: openaiKey });

  const anthropicClient = new Anthropic({ apiKey: anthropicKey });

  fs.mkdirSync(TRIALS_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const specConfigs: Array<{ type: SpecType; file: string }> = [
    { type: "prose", file: "prose.md" },
    { type: "structured", file: "structured.md" },
    { type: "openapi", file: "openapi.md" },
    { type: "c4", file: "c4.md" },
    { type: "typescript-contracts", file: "typescript-contracts.md" },
  ];

  const trials: TrialConfig[] = [];
  for (const spec of specConfigs) {
    for (let i = 1; i <= 3; i++) {
      trials.push({ id: `${spec.type}-${i}`, specType: spec.type, specPath: path.join(SPECS_DIR, spec.file), outputDir: path.join(TRIALS_DIR, `${spec.type}-${i}`, "code") });
    }
  }

  const allResults: AnalysisResult[] = [];
  const allJudgeScores: JudgeScore[] = [];

  for (const trial of trials) {
    const judgePath = path.join(TRIALS_DIR, trial.id, "judge-score.json");
    if (fs.existsSync(judgePath)) {
      console.log(`\n=== Skipping trial: ${trial.id} (already completed) ===`);
      const analysis = JSON.parse(fs.readFileSync(path.join(TRIALS_DIR, trial.id, "analysis.json"), "utf-8"));
      const judgeScore = JSON.parse(fs.readFileSync(judgePath, "utf-8"));
      allResults.push(analysis);
      allJudgeScores.push(judgeScore);
      continue;
    }
    console.log(`\n=== Running trial: ${trial.id} (${MODEL}) ===`);
    if (fs.existsSync(trial.outputDir)) fs.rmSync(trial.outputDir, { recursive: true });
    fs.mkdirSync(trial.outputDir, { recursive: true });

    try {
      const { transcript } = await runTrial(openaiClient, trial);
      fs.writeFileSync(path.join(TRIALS_DIR, trial.id, "transcript.json"), JSON.stringify(transcript, null, 2));

      const analysis = analyzeTrialOutput(trial.id, trial.specType, trial.outputDir, transcript);
      fs.writeFileSync(path.join(TRIALS_DIR, trial.id, "analysis.json"), JSON.stringify(analysis, null, 2));
      console.log(`  [${trial.id}] Analysis: ${analysis.constraints.totalViolations} violations, ${analysis.codeMetrics.totalFiles} files, ${analysis.codeMetrics.totalLines} lines`);
      console.log(`  [${trial.id}] Tokens: ${transcript.totalInputTokens} in + ${transcript.totalOutputTokens} out = ${transcript.totalInputTokens + transcript.totalOutputTokens} total`);
      allResults.push(analysis);

      console.log(`  [${trial.id}] Running judge (Sonnet 4.6)...`);
      const judgeScore = await runJudge(anthropicClient, trial.id, trial.specType, trial.outputDir);
      allJudgeScores.push(judgeScore);
      fs.writeFileSync(path.join(TRIALS_DIR, trial.id, "judge-score.json"), JSON.stringify(judgeScore, null, 2));
      console.log(`  [${trial.id}] Judge scores: arch=${judgeScore.architecturalAdherence} comp=${judgeScore.completeness} quality=${judgeScore.codeQuality} constraints=${judgeScore.constraintCompliance}`);
    } catch (error) {
      console.error(`  [${trial.id}] FAILED:`, error);
    }
  }

  console.log("\n=== Generating GPT-5-mini comparison report ===");
  const report = generateComparisonReport(allResults, allJudgeScores);
  fs.writeFileSync(path.join(RESULTS_DIR, "summary.md"), report);
  fs.writeFileSync(path.join(RESULTS_DIR, "all-results.json"), JSON.stringify({ results: allResults, judgeScores: allJudgeScores }, null, 2));
  console.log(`Report written to ${path.join(RESULTS_DIR, "summary.md")}`);
}

main().catch(console.error);
