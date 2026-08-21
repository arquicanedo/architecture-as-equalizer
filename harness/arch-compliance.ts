import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { checkRouteCoverage } from "./openapi-validator.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");

interface ArchCompliance {
  model: string;
  trialId: string;
  specType: string;
  // 1. Components (9 checks)
  componentsPresent: number;
  componentsTotal: number;
  // 2. Communication patterns
  directServiceImports: number;
  // 3. Data ownership
  exportedDataStores: number;
  // 4. Behavioral constraints
  httpInServices: number;
  externalDeps: number;
  servicePerFile: boolean;
  // 5. API surface
  routeCoverage: number;
  routesImplemented: number;
  routesTotal: number;
  // 6. Design rationale — not checkable
  // 7. File structure
  folderScore: number;
  // Aggregates
  totalViolations: number;
  complianceScore: number; // 0-100
}

const MODEL_DIRS: Array<{ dir: string; model: string }> = [
  { dir: "trials", model: "Sonnet 4.6" },
  { dir: "trials-haiku", model: "Haiku 4.5" },
  { dir: "trials-gpt-5-mini", model: "GPT-5-mini" },
  { dir: "trials-gpt-5", model: "GPT-5" },
  { dir: "trials-gemini-25-flash", model: "Gemini Flash" },
  { dir: "trials-gemini-25-pro", model: "Gemini Pro" },
  { dir: "trials-no-arch", model: "Sonnet 4.6 (no arch)" },
];

function main() {
  const allCompliance: ArchCompliance[] = [];

  for (const { dir, model } of MODEL_DIRS) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;

    const trials = fs.readdirSync(fullDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name).sort();

    for (const trialName of trials) {
      const analysisPath = path.join(fullDir, trialName, "analysis.json");
      const codeDir = path.join(fullDir, trialName, "code");
      if (!fs.existsSync(analysisPath) || !fs.existsSync(codeDir)) continue;

      const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
      const s = analysis.structural;
      const c = analysis.constraints;

      const components = [
        s.hasEventBus, s.hasUserService, s.hasProjectService,
        s.hasTaskService, s.hasCommentService, s.hasNotificationService,
        s.hasRouter, s.hasMainEntry, s.hasDemoScript
      ];
      const componentsPresent = components.filter(Boolean).length;

      const coverage = checkRouteCoverage(codeDir);

      // Compliance score: weighted across architecture elements
      // Components: 9 checks (weight 20)
      // Communication: no direct imports (weight 20)
      // Data ownership: no exported stores (weight 10)
      // Constraints: no HTTP in services + no ext deps + service per file (weight 20)
      // API surface: route coverage (weight 20)
      // File structure: folder score (weight 10)
      const componentsPct = (componentsPresent / 9) * 100;
      const commPct = c.directServiceCalls.length === 0 ? 100 : Math.max(0, 100 - c.directServiceCalls.length * 25);
      const dataPct = c.sharedDataAccess.length === 0 ? 100 : 0;
      const constraintsPct = (
        (c.httpInServices.length === 0 ? 1 : 0) +
        (c.externalDependencies.length === 0 ? 1 : 0) +
        (s.folderStructureScore >= 9 ? 1 : 0)
      ) / 3 * 100;
      const routePct = coverage.coveragePercent;
      const folderPct = (s.folderStructureScore / 10) * 100;

      const complianceScore = (
        componentsPct * 0.20 +
        commPct * 0.20 +
        dataPct * 0.10 +
        constraintsPct * 0.20 +
        routePct * 0.20 +
        folderPct * 0.10
      );

      allCompliance.push({
        model,
        trialId: trialName,
        specType: trialName.replace(/-\d+$/, ""),
        componentsPresent,
        componentsTotal: 9,
        directServiceImports: c.directServiceCalls.length,
        exportedDataStores: c.sharedDataAccess.length,
        httpInServices: c.httpInServices.length,
        externalDeps: c.externalDependencies.length,
        servicePerFile: s.folderStructureScore >= 9,
        routeCoverage: coverage.coveragePercent,
        routesImplemented: coverage.coveredRoutes,
        routesTotal: 25,
        folderScore: s.folderStructureScore,
        totalViolations: c.totalViolations,
        complianceScore: Math.round(complianceScore * 10) / 10,
      });
    }
  }

  // === Report 1: Compliance Score by Model × Format ===
  const models = [...new Set(allCompliance.map(c => c.model))];
  const specTypes = [...new Set(allCompliance.map(c => c.specType))].sort();
  const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  console.log("=".repeat(100));
  console.log("ARCHITECTURE COMPLIANCE REPORT — Weighted Compliance Score (0-100%) by Model × Format");
  console.log("=".repeat(100));
  console.log("Weights: Components 20%, Communication 20%, Constraints 20%, API Routes 20%, Data 10%, Structure 10%\n");

  const header = ["Format", ...models].map(s => s.padEnd(14)).join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const spec of specTypes) {
    const vals = models.map(model => {
      const trials = allCompliance.filter(c => c.model === model && c.specType === spec);
      if (trials.length === 0) return "—";
      return mean(trials.map(c => c.complianceScore)).toFixed(1) + "%";
    });
    console.log([spec.padEnd(14), ...vals.map(v => v.padEnd(14))].join(" | "));
  }

  // === Report 2: Breakdown by architecture element ===
  console.log("\n" + "=".repeat(100));
  console.log("ARCHITECTURE ELEMENT BREAKDOWN BY MODEL (mean across all formats)");
  console.log("=".repeat(100));

  const elements: Array<{ label: string; fn: (c: ArchCompliance) => number }> = [
    { label: "Components (/9)", fn: c => c.componentsPresent },
    { label: "Route Coverage %", fn: c => c.routeCoverage },
    { label: "Direct Svc Imports", fn: c => c.directServiceImports },
    { label: "HTTP in Services", fn: c => c.httpInServices },
    { label: "External Deps", fn: c => c.externalDeps },
    { label: "Exported Stores", fn: c => c.exportedDataStores },
    { label: "Folder Score (/10)", fn: c => c.folderScore },
    { label: "Total Violations", fn: c => c.totalViolations },
    { label: "Compliance Score %", fn: c => c.complianceScore },
  ];

  const header2 = ["Element", ...models].map(s => s.padEnd(18)).join(" | ");
  console.log(header2);
  console.log("-".repeat(header2.length));

  for (const el of elements) {
    const vals = models.map(model => {
      const trials = allCompliance.filter(c => c.model === model);
      return mean(trials.map(el.fn)).toFixed(1);
    });
    console.log([el.label.padEnd(18), ...vals.map(v => v.padEnd(18))].join(" | "));
  }

  // === Report 3: Per-element by Model × Format (for most important elements) ===
  for (const el of [
    { label: "Route Coverage %", fn: (c: ArchCompliance) => c.routeCoverage },
    { label: "Compliance Score %", fn: (c: ArchCompliance) => c.complianceScore },
    { label: "Components (/9)", fn: (c: ArchCompliance) => c.componentsPresent },
  ]) {
    console.log(`\n--- ${el.label} by Model × Format ---`);
    const h = ["Format", ...models].map(s => s.padEnd(14)).join(" | ");
    console.log(h);
    console.log("-".repeat(h.length));
    for (const spec of specTypes) {
      const vals = models.map(model => {
        const trials = allCompliance.filter(c => c.model === model && c.specType === spec);
        if (trials.length === 0) return "—";
        return mean(trials.map(el.fn)).toFixed(1);
      });
      console.log([spec.padEnd(14), ...vals.map(v => v.padEnd(14))].join(" | "));
    }
  }

  // === Report 4: What we check vs what we don't ===
  console.log("\n" + "=".repeat(100));
  console.log("COVERAGE OF ARCHITECTURE ELEMENTS");
  console.log("=".repeat(100));
  console.log(`
  Automatically verified (8 of 9 checks):
    ✓ Component existence (9 file presence checks)
    ✓ One service per file (folder structure score)
    ✓ No direct service-to-service imports (import analysis)
    ✓ No HTTP handling in services (keyword scan)
    ✓ No external npm dependencies (import analysis)
    ✓ No exported data stores (export keyword scan)
    ✓ Route coverage (25 routes, static analysis)
    ✓ TypeScript compilation (tsc --noEmit during trial)

  Not automatically verified:
    ✗ Design rationale (ADRs are input-only)
    ✗ Forward-only status transitions (full state machine)
    ✗ Event bus is genuinely pub/sub (vs constructor injection)
    ✗ Data ownership in practice (semantic leaks via return values)

  Estimated architecture coverage: ~80%
  `);

  // Save CSV
  const csvPath = path.join(PROJECT_ROOT, "results", "arch-compliance.csv");
  const csvHeader = Object.keys(allCompliance[0]).join(",");
  const csvRows = allCompliance.map(c => Object.values(c).join(","));
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join("\n"));
  console.log(`CSV saved to ${csvPath} (${allCompliance.length} rows)`);
}

main();
