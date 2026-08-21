import * as fs from "fs";
import * as path from "path";
import { AnalysisResult, TrialTranscript, JudgeScore, SpecType } from "./types.js";
import { analyzeTrialOutput, generateComparisonReport } from "./analyze-results.js";

import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const TRIALS_DIR = path.join(PROJECT_ROOT, "trials");
const RESULTS_DIR = path.join(PROJECT_ROOT, "results");

function main() {
  const trialDirs = fs
    .readdirSync(TRIALS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  if (trialDirs.length === 0) {
    console.error("No trial directories found in", TRIALS_DIR);
    process.exit(1);
  }

  const allResults: AnalysisResult[] = [];
  const allJudgeScores: JudgeScore[] = [];

  for (const trialName of trialDirs) {
    const trialDir = path.join(TRIALS_DIR, trialName);
    const codeDir = path.join(trialDir, "code");
    const transcriptPath = path.join(trialDir, "transcript.json");
    const judgePath = path.join(trialDir, "judge-score.json");

    if (!fs.existsSync(codeDir)) {
      console.log(`Skipping ${trialName}: no code directory`);
      continue;
    }

    const specType = trialName.replace(/-\d+$/, "") as SpecType;

    let transcript: TrialTranscript;
    if (fs.existsSync(transcriptPath)) {
      transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
    } else {
      transcript = {
        trialId: trialName,
        specType,
        messages: [],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalInputTokens: 0,
        totalOutputTokens: 0,
      };
    }

    console.log(`Analyzing ${trialName}...`);
    const analysis = analyzeTrialOutput(trialName, specType, codeDir, transcript);
    allResults.push(analysis);

    const analysisPath = path.join(trialDir, "analysis.json");
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    console.log(
      `  Violations: ${analysis.constraints.totalViolations}, Files: ${analysis.codeMetrics.totalFiles}, Lines: ${analysis.codeMetrics.totalLines}`
    );

    if (fs.existsSync(judgePath)) {
      allJudgeScores.push(JSON.parse(fs.readFileSync(judgePath, "utf-8")));
    }
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const report = generateComparisonReport(allResults, allJudgeScores);
  const reportPath = path.join(RESULTS_DIR, "summary.md");
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport written to ${reportPath}`);
}

main();
