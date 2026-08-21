import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { fileURLToPath } from "url";
import { execSync, spawn, ChildProcess } from "child_process";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "..");

// ============================================================
// 1. ROUTE COVERAGE CHECK (static analysis)
// ============================================================

interface SpecRoute {
  method: string;
  path: string;
  operation: string;
}

const SPEC_ROUTES: SpecRoute[] = [
  { method: "GET", path: "/users", operation: "getAll" },
  { method: "POST", path: "/users", operation: "create" },
  { method: "GET", path: "/users/:id", operation: "getById" },
  { method: "PUT", path: "/users/:id", operation: "update" },
  { method: "DELETE", path: "/users/:id", operation: "delete" },
  { method: "GET", path: "/projects", operation: "getAll" },
  { method: "POST", path: "/projects", operation: "create" },
  { method: "GET", path: "/projects/:id", operation: "getById" },
  { method: "PUT", path: "/projects/:id", operation: "update" },
  { method: "DELETE", path: "/projects/:id", operation: "delete" },
  { method: "POST", path: "/projects/:id/members", operation: "addMember" },
  { method: "DELETE", path: "/projects/:id/members", operation: "removeMember" },
  { method: "GET", path: "/tasks", operation: "getByProject" },
  { method: "POST", path: "/tasks", operation: "create" },
  { method: "GET", path: "/tasks/:id", operation: "getById" },
  { method: "PUT", path: "/tasks/:id", operation: "update" },
  { method: "DELETE", path: "/tasks/:id", operation: "delete" },
  { method: "PUT", path: "/tasks/:id/status", operation: "changeStatus" },
  { method: "PUT", path: "/tasks/:id/assign", operation: "assign" },
  { method: "GET", path: "/comments", operation: "getByTask" },
  { method: "POST", path: "/comments", operation: "create" },
  { method: "GET", path: "/comments/:id", operation: "getById" },
  { method: "DELETE", path: "/comments/:id", operation: "delete" },
  { method: "GET", path: "/notifications", operation: "getByUser" },
  { method: "PUT", path: "/notifications/:id/read", operation: "markAsRead" },
];

export interface RouteCoverageResult {
  totalSpecRoutes: number;
  coveredRoutes: number;
  missingRoutes: SpecRoute[];
  extraRoutes: string[];
  coveragePercent: number;
}

export function checkRouteCoverage(codeDir: string): RouteCoverageResult {
  const routerFiles = findFiles(codeDir, (f) =>
    f.includes("router") || f.includes("routes") || f.includes("app")
  );

  let routerContent = "";
  for (const f of routerFiles) {
    routerContent += fs.readFileSync(f, "utf-8") + "\n";
  }

  // Also check main.ts in case routing is inline
  const mainFiles = findFiles(codeDir, (f) =>
    f.includes("main") || f.includes("index") || f.includes("server")
  );
  for (const f of mainFiles) {
    routerContent += fs.readFileSync(f, "utf-8") + "\n";
  }

  const contentLower = routerContent.toLowerCase();

  const covered: SpecRoute[] = [];
  const missing: SpecRoute[] = [];

  for (const route of SPEC_ROUTES) {
    const methodLower = route.method.toLowerCase();
    const pathSegments = route.path.split("/").filter(Boolean);
    const resource = pathSegments[0]; // users, projects, tasks, comments, notifications

    // Check for the method+resource combination in the router
    let found = false;

    // Pattern 1: string matching on path
    const pathVariants = [
      route.path,
      route.path.replace(":id", ""),
      route.path.replace("/:id", ""),
    ];

    for (const pv of pathVariants) {
      if (contentLower.includes(`"${pv.toLowerCase()}"`) || contentLower.includes(`'${pv.toLowerCase()}'`)) {
        found = true;
        break;
      }
    }

    // Pattern 2: check for resource + method combination
    if (!found) {
      const hasResource = contentLower.includes(`/${resource}`);
      const hasMethod = contentLower.includes(`"${methodLower}"`) ||
        contentLower.includes(`'${methodLower}'`) ||
        contentLower.includes(`=== "${methodLower}"`) ||
        contentLower.includes(`=== '${methodLower}'`) ||
        contentLower.includes(`method === "${methodLower}"`);

      // For sub-paths like /status, /assign, /members, /read
      if (pathSegments.length >= 3) {
        const subPath = pathSegments[pathSegments.length - 1];
        if (subPath !== ":id") {
          found = hasResource && contentLower.includes(subPath);
        } else {
          found = hasResource && hasMethod;
        }
      } else {
        found = hasResource && hasMethod;
      }
    }

    // Pattern 3: check for operation name
    if (!found) {
      const opVariants = [
        route.operation,
        route.operation.replace(/([A-Z])/g, "_$1").toLowerCase(),
        route.operation.toLowerCase(),
      ];
      for (const op of opVariants) {
        if (contentLower.includes(op)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      covered.push(route);
    } else {
      missing.push(route);
    }
  }

  return {
    totalSpecRoutes: SPEC_ROUTES.length,
    coveredRoutes: covered.length,
    missingRoutes: missing,
    extraRoutes: [],
    coveragePercent: (covered.length / SPEC_ROUTES.length) * 100,
  };
}

// ============================================================
// 2. RUNTIME CONTRACT TESTING
// ============================================================

export interface ContractTestResult {
  totalTests: number;
  passed: number;
  failed: number;
  errors: string[];
  serverStarted: boolean;
  details: ContractTestDetail[];
}

interface ContractTestDetail {
  method: string;
  path: string;
  expectedStatus: number;
  actualStatus: number | null;
  bodyValid: boolean;
  error?: string;
}

function request(
  method: string,
  urlPath: string,
  body?: unknown,
  port = 3000
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "localhost",
        port,
        path: urlPath,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          let parsed: any;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on("error", (e) => reject(e));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    if (data) req.write(data);
    req.end();
  });
}

async function waitForServer(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await request("GET", "/users", undefined, port);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return false;
}

export async function runContractTests(codeDir: string): Promise<ContractTestResult> {
  const result: ContractTestResult = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: [],
    serverStarted: false,
    details: [],
  };

  // Find main entry point
  const mainCandidates = ["src/main.ts", "src/index.ts", "src/server.ts", "src/app.ts", "main.ts", "index.ts"];
  let mainFile = "";
  for (const c of mainCandidates) {
    if (fs.existsSync(path.join(codeDir, c))) {
      mainFile = c;
      break;
    }
  }

  if (!mainFile) {
    result.errors.push("No main entry point found");
    return result;
  }

  // Start server
  const port = 3000 + Math.floor(Math.random() * 1000);
  let server: ChildProcess | null = null;

  try {
    server = spawn("npx", ["tsx", mainFile], {
      cwd: codeDir,
      env: { ...process.env, PORT: port.toString() },
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    // Give server time to start
    const started = await waitForServer(port, 8000);
    if (!started) {
      result.errors.push("Server failed to start within 8 seconds");
      return result;
    }
    result.serverStarted = true;

    // Run contract tests
    const tests: Array<{
      method: string;
      path: string;
      body?: unknown;
      expectedStatus: number;
      label: string;
    }> = [
      // Create users
      { method: "POST", path: "/users", body: { name: "Alice", email: "alice@test.com" }, expectedStatus: 201, label: "Create user" },
      { method: "GET", path: "/users", expectedStatus: 200, label: "List users" },
      // Create project
      { method: "POST", path: "/projects", body: { name: "Project1", description: "Test" }, expectedStatus: 201, label: "Create project" },
      { method: "GET", path: "/projects", expectedStatus: 200, label: "List projects" },
    ];

    // First pass: create resources and collect IDs
    let userId = "";
    let projectId = "";
    let taskId = "";
    let commentId = "";
    let notificationId = "";

    // Create user
    try {
      const res = await request("POST", "/users", { name: "Alice", email: "alice@test.com" }, port);
      result.totalTests++;
      if (res.status === 201 || res.status === 200) {
        result.passed++;
        userId = res.body?.id || "";
        result.details.push({ method: "POST", path: "/users", expectedStatus: 201, actualStatus: res.status, bodyValid: !!res.body?.id });
      } else {
        result.failed++;
        result.details.push({ method: "POST", path: "/users", expectedStatus: 201, actualStatus: res.status, bodyValid: false });
      }
    } catch (e: any) {
      result.totalTests++;
      result.failed++;
      result.details.push({ method: "POST", path: "/users", expectedStatus: 201, actualStatus: null, bodyValid: false, error: e.message });
    }

    // List users
    try {
      const res = await request("GET", "/users", undefined, port);
      result.totalTests++;
      const valid = res.status === 200 && Array.isArray(res.body);
      if (valid) result.passed++; else result.failed++;
      result.details.push({ method: "GET", path: "/users", expectedStatus: 200, actualStatus: res.status, bodyValid: valid });
    } catch (e: any) {
      result.totalTests++; result.failed++;
      result.details.push({ method: "GET", path: "/users", expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
    }

    // Create project
    try {
      const res = await request("POST", "/projects", { name: "Project1", description: "Test project" }, port);
      result.totalTests++;
      if (res.status === 201 || res.status === 200) {
        result.passed++;
        projectId = res.body?.id || "";
      } else {
        result.failed++;
      }
      result.details.push({ method: "POST", path: "/projects", expectedStatus: 201, actualStatus: res.status, bodyValid: !!res.body?.id });
    } catch (e: any) {
      result.totalTests++; result.failed++;
      result.details.push({ method: "POST", path: "/projects", expectedStatus: 201, actualStatus: null, bodyValid: false, error: e.message });
    }

    // Add member
    if (userId && projectId) {
      try {
        const res = await request("POST", `/projects/${projectId}/members`, { userId }, port);
        result.totalTests++;
        if (res.status >= 200 && res.status < 300) result.passed++; else result.failed++;
        result.details.push({ method: "POST", path: `/projects/:id/members`, expectedStatus: 200, actualStatus: res.status, bodyValid: res.status >= 200 && res.status < 300 });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "POST", path: `/projects/:id/members`, expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Create task
    if (projectId) {
      try {
        const res = await request("POST", "/tasks", { title: "Task1", description: "Test task", projectId }, port);
        result.totalTests++;
        if (res.status === 201 || res.status === 200) {
          result.passed++;
          taskId = res.body?.id || "";
        } else {
          result.failed++;
        }
        result.details.push({ method: "POST", path: "/tasks", expectedStatus: 201, actualStatus: res.status, bodyValid: !!res.body?.id });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "POST", path: "/tasks", expectedStatus: 201, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Assign task
    if (taskId && userId) {
      try {
        const res = await request("PUT", `/tasks/${taskId}/assign`, { assigneeId: userId }, port);
        result.totalTests++;
        if (res.status >= 200 && res.status < 300) result.passed++; else result.failed++;
        result.details.push({ method: "PUT", path: "/tasks/:id/assign", expectedStatus: 200, actualStatus: res.status, bodyValid: res.status >= 200 && res.status < 300 });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "PUT", path: "/tasks/:id/assign", expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Change status
    if (taskId) {
      try {
        const res = await request("PUT", `/tasks/${taskId}/status`, { status: "in-progress" }, port);
        result.totalTests++;
        if (res.status >= 200 && res.status < 300) result.passed++; else result.failed++;
        result.details.push({ method: "PUT", path: "/tasks/:id/status", expectedStatus: 200, actualStatus: res.status, bodyValid: res.status >= 200 && res.status < 300 });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "PUT", path: "/tasks/:id/status", expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
      }

      // Invalid backward transition
      try {
        const res = await request("PUT", `/tasks/${taskId}/status`, { status: "todo" }, port);
        result.totalTests++;
        if (res.status === 400) result.passed++; else result.failed++;
        result.details.push({ method: "PUT", path: "/tasks/:id/status (backward)", expectedStatus: 400, actualStatus: res.status, bodyValid: res.status === 400 });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "PUT", path: "/tasks/:id/status (backward)", expectedStatus: 400, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Create comment
    if (taskId && userId) {
      try {
        const res = await request("POST", "/comments", { taskId, authorId: userId, body: "Test comment" }, port);
        result.totalTests++;
        if (res.status === 201 || res.status === 200) {
          result.passed++;
          commentId = res.body?.id || "";
        } else {
          result.failed++;
        }
        result.details.push({ method: "POST", path: "/comments", expectedStatus: 201, actualStatus: res.status, bodyValid: !!res.body?.id });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "POST", path: "/comments", expectedStatus: 201, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Check notifications
    if (userId) {
      try {
        const res = await request("GET", `/notifications?userId=${userId}`, undefined, port);
        result.totalTests++;
        const valid = res.status === 200 && Array.isArray(res.body);
        if (valid) {
          result.passed++;
          if (res.body.length > 0) notificationId = res.body[0].id || "";
        } else {
          result.failed++;
        }
        result.details.push({ method: "GET", path: "/notifications?userId=X", expectedStatus: 200, actualStatus: res.status, bodyValid: valid });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "GET", path: "/notifications?userId=X", expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Mark notification read
    if (notificationId) {
      try {
        const res = await request("PUT", `/notifications/${notificationId}/read`, {}, port);
        result.totalTests++;
        if (res.status >= 200 && res.status < 300) result.passed++; else result.failed++;
        result.details.push({ method: "PUT", path: "/notifications/:id/read", expectedStatus: 200, actualStatus: res.status, bodyValid: res.status >= 200 && res.status < 300 });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "PUT", path: "/notifications/:id/read", expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // Get by ID tests
    if (userId) {
      try {
        const res = await request("GET", `/users/${userId}`, undefined, port);
        result.totalTests++;
        if (res.status === 200 && res.body?.id === userId) result.passed++; else result.failed++;
        result.details.push({ method: "GET", path: "/users/:id", expectedStatus: 200, actualStatus: res.status, bodyValid: res.body?.id === userId });
      } catch (e: any) {
        result.totalTests++; result.failed++;
        result.details.push({ method: "GET", path: "/users/:id", expectedStatus: 200, actualStatus: null, bodyValid: false, error: e.message });
      }
    }

    // 404 test
    try {
      const res = await request("GET", "/users/nonexistent-id-12345", undefined, port);
      result.totalTests++;
      if (res.status === 404) result.passed++; else result.failed++;
      result.details.push({ method: "GET", path: "/users/:id (404)", expectedStatus: 404, actualStatus: res.status, bodyValid: res.status === 404 });
    } catch (e: any) {
      result.totalTests++; result.failed++;
      result.details.push({ method: "GET", path: "/users/:id (404)", expectedStatus: 404, actualStatus: null, bodyValid: false, error: e.message });
    }

  } finally {
    if (server) {
      server.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 500));
      try { server.kill("SIGKILL"); } catch {}
    }
    // Kill any leftover node processes on this port
    try { execSync(`npx kill-port ${port} 2>/dev/null`, { stdio: "pipe" }); } catch {}
  }

  return result;
}

// ============================================================
// 3. RESPONSE SCHEMA VALIDATION
// ============================================================

interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
}

const SCHEMAS: Record<string, SchemaField[]> = {
  User: [
    { name: "id", type: "string", required: true },
    { name: "name", type: "string", required: true },
    { name: "email", type: "string", required: true },
  ],
  Project: [
    { name: "id", type: "string", required: true },
    { name: "name", type: "string", required: true },
    { name: "description", type: "string", required: true },
    { name: "memberIds", type: "array", required: true },
  ],
  Task: [
    { name: "id", type: "string", required: true },
    { name: "title", type: "string", required: true },
    { name: "description", type: "string", required: true },
    { name: "status", type: "string", required: true },
    { name: "projectId", type: "string", required: true },
  ],
  Comment: [
    { name: "id", type: "string", required: true },
    { name: "taskId", type: "string", required: true },
    { name: "authorId", type: "string", required: true },
    { name: "body", type: "string", required: true },
  ],
  Notification: [
    { name: "id", type: "string", required: true },
    { name: "userId", type: "string", required: true },
    { name: "message", type: "string", required: true },
    { name: "read", type: "boolean", required: true },
  ],
};

export interface SchemaValidationResult {
  totalChecks: number;
  passed: number;
  failed: number;
  details: SchemaCheckDetail[];
}

interface SchemaCheckDetail {
  entity: string;
  field: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export function validateResponseSchemas(responses: ContractTestResult): SchemaValidationResult {
  const result: SchemaValidationResult = {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    details: [],
  };

  // Map endpoint paths to schema types
  const pathToSchema: Record<string, string> = {
    "/users": "User",
    "/projects": "Project",
    "/tasks": "Task",
    "/comments": "Comment",
    "/notifications": "Notification",
  };

  for (const detail of responses.details) {
    if (!detail.bodyValid || detail.actualStatus === null) continue;
    if (detail.actualStatus >= 400) continue;

    // Find matching schema
    let schemaName = "";
    for (const [pathPrefix, schema] of Object.entries(pathToSchema)) {
      if (detail.path.startsWith(pathPrefix) || detail.path.includes(pathPrefix)) {
        schemaName = schema;
        break;
      }
    }

    if (!schemaName || !SCHEMAS[schemaName]) continue;

    // We can't easily get the response body here since it's not stored in ContractTestDetail
    // This validator works on the contract test results to check that bodyValid was correct
    // For full schema validation, we'd need to store response bodies
    result.totalChecks++;
    if (detail.bodyValid) {
      result.passed++;
    } else {
      result.failed++;
    }
    result.details.push({
      entity: schemaName,
      field: "bodyValid",
      expected: "true",
      actual: String(detail.bodyValid),
      pass: detail.bodyValid,
    });
  }

  return result;
}

// ============================================================
// MAIN: Run all validators on all trial directories
// ============================================================

function findFiles(dir: string, predicate: (f: string) => boolean): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      results.push(...findFiles(full, predicate));
    } else if (entry.isFile() && predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const trialsDirs = [
    "trials", "trials-haiku",
    "trials-gpt-5-mini", "trials-gpt-5",
    "trials-gemini-25-flash", "trials-gemini-25-pro",
  ];

  const modelNames: Record<string, string> = {
    "trials": "Sonnet 4.6",
    "trials-haiku": "Haiku 4.5",
    "trials-gpt-5-mini": "GPT-5-mini",
    "trials-gpt-5": "GPT-5",
    "trials-gemini-25-flash": "Gemini Flash",
    "trials-gemini-25-pro": "Gemini Pro",
  };

  const allCoverage: Array<{ model: string; trialId: string; specType: string; coverage: RouteCoverageResult }> = [];
  const allContract: Array<{ model: string; trialId: string; specType: string; contract: ContractTestResult }> = [];

  // Only run runtime tests if --runtime flag is passed
  const runRuntime = process.argv.includes("--runtime");

  for (const trialsDir of trialsDirs) {
    const fullDir = path.join(PROJECT_ROOT, trialsDir);
    if (!fs.existsSync(fullDir)) continue;

    const model = modelNames[trialsDir] || trialsDir;
    const dirs = fs.readdirSync(fullDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name).sort();

    for (const trialName of dirs) {
      const codeDir = path.join(fullDir, trialName, "code");
      if (!fs.existsSync(codeDir)) continue;

      const specType = trialName.replace(/-\d+$/, "");

      // 1. Route coverage (always run — static analysis)
      const coverage = checkRouteCoverage(codeDir);
      allCoverage.push({ model, trialId: trialName, specType, coverage });

      // 2. Runtime contract tests (only with --runtime flag)
      if (runRuntime) {
        console.log(`  Running contract tests: ${model} / ${trialName}...`);
        try {
          const contract = await runContractTests(codeDir);
          allContract.push({ model, trialId: trialName, specType, contract });
          console.log(`    Server: ${contract.serverStarted ? "YES" : "NO"}, Tests: ${contract.passed}/${contract.totalTests}`);
        } catch (e: any) {
          console.log(`    FAILED: ${e.message}`);
        }
      }
    }
  }

  // === Report: Route Coverage ===
  console.log("\n" + "=".repeat(80));
  console.log("OPENAPI VALIDATION REPORT 1: ROUTE COVERAGE (static analysis)");
  console.log("=".repeat(80));

  const models = [...new Set(allCoverage.map(c => c.model))];
  const specTypes = [...new Set(allCoverage.map(c => c.specType))].sort();

  console.log(`\nTotal spec routes: ${SPEC_ROUTES.length}`);
  console.log(`\n--- Coverage % by Model × Format ---`);

  const header = ["Format", ...models].map(s => s.padEnd(16)).join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const spec of specTypes) {
    const vals = models.map(model => {
      const trials = allCoverage.filter(c => c.model === model && c.specType === spec);
      if (trials.length === 0) return "—";
      const mean = trials.reduce((a, c) => a + c.coverage.coveragePercent, 0) / trials.length;
      return mean.toFixed(0) + "%";
    });
    console.log([spec.padEnd(16), ...vals.map(v => v.padEnd(16))].join(" | "));
  }

  console.log(`\n--- Most Commonly Missing Routes ---`);
  const missingCounts: Record<string, number> = {};
  for (const c of allCoverage) {
    for (const m of c.coverage.missingRoutes) {
      const key = `${m.method} ${m.path}`;
      missingCounts[key] = (missingCounts[key] || 0) + 1;
    }
  }
  const sorted = Object.entries(missingCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [route, count] of sorted) {
    console.log(`  ${route}: missing in ${count}/${allCoverage.length} trials`);
  }

  // === Report: Runtime Contract Tests ===
  if (allContract.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("OPENAPI VALIDATION REPORT 2: RUNTIME CONTRACT TESTS");
    console.log("=".repeat(80));

    console.log(`\n--- Server Start Rate ---`);
    for (const model of models) {
      const trials = allContract.filter(c => c.model === model);
      if (trials.length === 0) continue;
      const started = trials.filter(c => c.contract.serverStarted).length;
      console.log(`  ${model}: ${started}/${trials.length} servers started`);
    }

    console.log(`\n--- Contract Test Pass Rate by Model × Format ---`);
    const header2 = ["Format", ...models].map(s => s.padEnd(16)).join(" | ");
    console.log(header2);
    console.log("-".repeat(header2.length));

    for (const spec of specTypes) {
      const vals = models.map(model => {
        const trials = allContract.filter(c => c.model === model && c.specType === spec);
        if (trials.length === 0) return "—";
        const totalPassed = trials.reduce((a, c) => a + c.contract.passed, 0);
        const totalTests = trials.reduce((a, c) => a + c.contract.totalTests, 0);
        return totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(0) + "%" : "N/A";
      });
      console.log([spec.padEnd(16), ...vals.map(v => v.padEnd(16))].join(" | "));
    }
  }

  // Save results
  const outputPath = path.join(PROJECT_ROOT, "results", "openapi-validation.json");
  fs.writeFileSync(outputPath, JSON.stringify({ coverage: allCoverage, contract: allContract }, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(console.error);
