import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { JudgeScore, SpecType } from "./types.js";
import { buildJudgePrompt } from "./judge-prompt.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");

const MODEL = "gpt-5";

interface FunctionToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
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

async function judgeWithGpt5(
  client: OpenAI,
  trialId: string,
  specType: SpecType,
  codeDir: string
): Promise<JudgeScore> {
  const files: Record<string, string> = {};
  for (const [rel, content] of collectTsFiles(codeDir)) files[rel] = content;

  if (Object.keys(files).length === 0) {
    console.log(`  [gpt5-judge:${trialId}] No code files found`);
    return { trialId, specType, architecturalAdherence: 0, completeness: 0, codeQuality: 0, constraintCompliance: 0, overall: 0, notes: "No code files produced" };
  }

  const prompt = buildJudgePrompt(files);

  const response = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in judge response");
    const scores = JSON.parse(jsonMatch[0]);
    const overall = (scores.architecturalAdherence + scores.completeness + scores.codeQuality + scores.constraintCompliance) / 4;
    return {
      trialId, specType,
      architecturalAdherence: scores.architecturalAdherence,
      completeness: scores.completeness,
      codeQuality: scores.codeQuality,
      constraintCompliance: scores.constraintCompliance,
      overall: parseFloat(overall.toFixed(2)),
      notes: scores.notes || "",
    };
  } catch (e) {
    console.error(`  [gpt5-judge:${trialId}] Parse error:`, e);
    return { trialId, specType, architecturalAdherence: 0, completeness: 0, codeQuality: 0, constraintCompliance: 0, overall: 0, notes: `Parse error: ${text.slice(0, 200)}` };
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error("OPENAI_API_KEY required"); process.exit(1); }

  const client = new OpenAI({ apiKey });

  const MODEL_DIRS: Array<{ dir: string; model: string }> = [
    { dir: "trials", model: "Sonnet 4.6" },
    { dir: "trials-haiku", model: "Haiku 4.5" },
    { dir: "trials-gpt-5-mini", model: "GPT-5-mini" },
    { dir: "trials-gpt-5", model: "GPT-5" },
    { dir: "trials-gemini-25-flash", model: "Gemini Flash" },
    { dir: "trials-gemini-25-pro", model: "Gemini Pro" },
  ];

  // Select 5 trials per model (first trial of each spec type)
  const allScores: Array<{ model: string; trialId: string; specType: string; sonnetScore: JudgeScore; gpt5Score: JudgeScore }> = [];

  for (const { dir, model } of MODEL_DIRS) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;

    const specTypes = ["prose", "structured", "openapi", "c4", "typescript-contracts"];

    for (const spec of specTypes) {
      const trialName = `${spec}-1`;
      const codeDir = path.join(fullDir, trialName, "code");
      const sonnetJudgePath = path.join(fullDir, trialName, "judge-score.json");
      const gpt5JudgePath = path.join(fullDir, trialName, "judge-score-gpt5.json");

      if (!fs.existsSync(codeDir) || !fs.existsSync(sonnetJudgePath)) continue;

      // Skip if already judged
      if (fs.existsSync(gpt5JudgePath)) {
        console.log(`Skipping ${model} / ${trialName} (already judged)`);
        const sonnetScore = JSON.parse(fs.readFileSync(sonnetJudgePath, "utf-8"));
        const gpt5Score = JSON.parse(fs.readFileSync(gpt5JudgePath, "utf-8"));
        allScores.push({ model, trialId: trialName, specType: spec, sonnetScore, gpt5Score });
        continue;
      }

      console.log(`Judging ${model} / ${trialName} with GPT-5...`);
      const specType = spec as SpecType;
      const gpt5Score = await judgeWithGpt5(client, trialName, specType, codeDir);
      const sonnetScore: JudgeScore = JSON.parse(fs.readFileSync(sonnetJudgePath, "utf-8"));

      fs.writeFileSync(gpt5JudgePath, JSON.stringify(gpt5Score, null, 2));

      allScores.push({ model, trialId: trialName, specType: spec, sonnetScore, gpt5Score });

      console.log(`  Sonnet: arch=${sonnetScore.architecturalAdherence} comp=${sonnetScore.completeness} qual=${sonnetScore.codeQuality} constr=${sonnetScore.constraintCompliance} overall=${sonnetScore.overall}`);
      console.log(`  GPT-5:  arch=${gpt5Score.architecturalAdherence} comp=${gpt5Score.completeness} qual=${gpt5Score.codeQuality} constr=${gpt5Score.constraintCompliance} overall=${gpt5Score.overall}`);
      console.log(`  Delta:  ${(gpt5Score.overall - sonnetScore.overall).toFixed(2)}`);
    }
  }

  // Compute inter-judge agreement
  console.log("\n" + "=".repeat(80));
  console.log("INTER-JUDGE AGREEMENT: Sonnet 4.6 vs GPT-5");
  console.log("=".repeat(80));
  console.log(`Trials compared: ${allScores.length}`);

  const pearson = (xs: number[], ys: number[]) => {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
    return dx && dy ? num / Math.sqrt(dx * dy) : 0;
  };

  const meanAbsDiff = (xs: number[], ys: number[]) =>
    xs.reduce((a, _, i) => a + Math.abs(xs[i] - ys[i]), 0) / xs.length;

  for (const dim of ["architecturalAdherence", "completeness", "codeQuality", "constraintCompliance", "overall"] as const) {
    const sonnetVals = allScores.map(s => s.sonnetScore[dim]);
    const gpt5Vals = allScores.map(s => s.gpt5Score[dim]);
    const r = pearson(sonnetVals, gpt5Vals);
    const mad = meanAbsDiff(sonnetVals, gpt5Vals);
    const sonnetMean = sonnetVals.reduce((a, b) => a + b, 0) / sonnetVals.length;
    const gpt5Mean = gpt5Vals.reduce((a, b) => a + b, 0) / gpt5Vals.length;
    console.log(`\n${dim}:`);
    console.log(`  Sonnet mean: ${sonnetMean.toFixed(2)} | GPT-5 mean: ${gpt5Mean.toFixed(2)} | Bias: ${(gpt5Mean - sonnetMean).toFixed(2)}`);
    console.log(`  Pearson r: ${r.toFixed(3)} | Mean abs diff: ${mad.toFixed(2)}`);
  }

  // Per-trial comparison table
  console.log("\n\n--- Per-Trial Comparison ---");
  console.log("Model".padEnd(14) + "Trial".padEnd(22) + "Sonnet".padEnd(8) + "GPT-5".padEnd(8) + "Delta".padEnd(8));
  console.log("-".repeat(60));
  for (const s of allScores) {
    console.log(
      s.model.padEnd(14) +
      s.trialId.padEnd(22) +
      s.sonnetScore.overall.toFixed(2).padEnd(8) +
      s.gpt5Score.overall.toFixed(2).padEnd(8) +
      (s.gpt5Score.overall - s.sonnetScore.overall).toFixed(2).padEnd(8)
    );
  }

  // Save results
  const outputPath = path.join(PROJECT_ROOT, "results", "inter-judge-agreement.json");
  fs.writeFileSync(outputPath, JSON.stringify(allScores, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(console.error);
