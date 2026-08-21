import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { analyzeTrialOutput } from "./analyze-results.js";
import { checkRouteCoverage } from "./openapi-validator.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");
const TRIALS_DIR = path.join(PROJECT_ROOT, "trials-no-arch");

function main() {
  if (!fs.existsSync(TRIALS_DIR)) {
    console.error("No trials-no-arch directory found");
    process.exit(1);
  }

  const trials = fs.readdirSync(TRIALS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const trialName of trials) {
    const codeDir = path.join(TRIALS_DIR, trialName, "code");
    const transcriptPath = path.join(TRIALS_DIR, trialName, "transcript.json");
    const analysisPath = path.join(TRIALS_DIR, trialName, "analysis.json");

    if (!fs.existsSync(codeDir)) {
      console.log(`Skipping ${trialName}: no code directory`);
      continue;
    }

    if (fs.existsSync(analysisPath)) {
      console.log(`Skipping ${trialName}: analysis.json already exists`);
      continue;
    }

    console.log(`Analyzing ${trialName}...`);

    const transcript = fs.existsSync(transcriptPath)
      ? JSON.parse(fs.readFileSync(transcriptPath, "utf-8"))
      : null;

    const analysis = analyzeTrialOutput(
      trialName,
      "prose" as any, // SpecType doesn't matter for analysis
      codeDir,
      transcript
    );

    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

    // Also run route coverage
    const coverage = checkRouteCoverage(codeDir);

    console.log(`  Components: ${[
      analysis.structural.hasEventBus && "EventBus",
      analysis.structural.hasUserService && "UserSvc",
      analysis.structural.hasProjectService && "ProjectSvc",
      analysis.structural.hasTaskService && "TaskSvc",
      analysis.structural.hasCommentService && "CommentSvc",
      analysis.structural.hasNotificationService && "NotifSvc",
      analysis.structural.hasRouter && "Router",
    ].filter(Boolean).join(", ") || "none"}`);
    console.log(`  Routes: ${coverage.coveredRoutes}/25 (${coverage.coveragePercent}%)`);
    console.log(`  Violations: ${analysis.constraints.totalViolations}`);
    console.log(`  Files: ${analysis.codeMetrics.totalFiles}, Lines: ${analysis.codeMetrics.totalLines}`);

    if (transcript) {
      console.log(`  Tokens: ${transcript.totalInputTokens + transcript.totalOutputTokens}`);
    }

    // Print judge score if available
    const judgePath = path.join(TRIALS_DIR, trialName, "judge-score.json");
    if (fs.existsSync(judgePath)) {
      const judge = JSON.parse(fs.readFileSync(judgePath, "utf-8"));
      console.log(`  Judge: arch=${judge.architecturalAdherence} comp=${judge.completeness} qual=${judge.codeQuality} constr=${judge.constraintCompliance} overall=${judge.overall}`);
    }
  }
}

main();
