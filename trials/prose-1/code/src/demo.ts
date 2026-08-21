/**
 * demo.ts — end-to-end demonstration of the Task Management API.
 *
 * Starts the HTTP server, runs through all major features, prints
 * results, then shuts down cleanly.
 *
 * Run with:  npx tsx src/demo.ts
 */

import http from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { ApiRouter } from "./router.js";

// ── Spin up an isolated server for the demo ───────────────────────────────────

const DEMO_PORT = 3001;

const eventBus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus);

const router = new ApiRouter(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

const server = http.createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error("Router error:", err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  });
});

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: "localhost",
      port: DEMO_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) as T });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: raw as unknown as T });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Pretty printer ────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN  = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED   = "\x1b[31m";

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}${"─".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${"─".repeat(60)}${RESET}`);
}

function step(label: string): void {
  console.log(`\n${BOLD}${YELLOW}▶ ${label}${RESET}`);
}

function result(tag: string, data: unknown): void {
  const statusColor = typeof data === "object" && data !== null && "error" in data ? RED : GREEN;
  console.log(`  ${statusColor}${tag}${RESET}`, JSON.stringify(data, null, 2).replace(/\n/g, "\n  "));
}

function checkStatus(label: string, got: number, expected: number): void {
  const ok = got === expected;
  const icon = ok ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`;
  console.log(`  ${icon} ${label} — HTTP ${got} (expected ${expected})`);
  if (!ok) throw new Error(`Assertion failed: ${label}`);
}

// ── Demo scenarios ────────────────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  console.log(`\n${BOLD}Task Management API — Demo${RESET}`);
  console.log(`Server listening on http://localhost:${DEMO_PORT}\n`);

  // ── 1. Users ──────────────────────────────────────────────────────────────
  section("1. User Management");

  step("Create user Alice");
  const aliceRes = await request("POST", "/users", {
    name: "Alice",
    email: "alice@example.com",
  });
  checkStatus("Create Alice", aliceRes.status, 201);
  const alice = aliceRes.body as { id: string; name: string; email: string };
  result("Alice", alice);

  step("Create user Bob");
  const bobRes = await request("POST", "/users", {
    name: "Bob",
    email: "bob@example.com",
  });
  checkStatus("Create Bob", bobRes.status, 201);
  const bob = bobRes.body as { id: string; name: string; email: string };
  result("Bob", bob);

  step("Create user Carol");
  const carolRes = await request("POST", "/users", {
    name: "Carol",
    email: "carol@example.com",
  });
  checkStatus("Create Carol", carolRes.status, 201);
  const carol = carolRes.body as { id: string; name: string; email: string };
  result("Carol", carol);

  step("List all users");
  const usersRes = await request("GET", "/users");
  checkStatus("List users", usersRes.status, 200);
  result("Users", usersRes.body);

  step("Update Alice's name");
  const aliceUpdateRes = await request("PUT", `/users/${alice.id}`, {
    name: "Alice Smith",
  });
  checkStatus("Update Alice", aliceUpdateRes.status, 200);
  result("Updated Alice", aliceUpdateRes.body);

  step("Try creating duplicate email (should fail)");
  const dupRes = await request("POST", "/users", {
    name: "Alice Duplicate",
    email: "alice@example.com",
  });
  checkStatus("Duplicate email → 400", dupRes.status, 400);
  result("Error", dupRes.body);

  // ── 2. Projects ───────────────────────────────────────────────────────────
  section("2. Project Management");

  step("Create project Alpha");
  const projRes = await request("POST", "/projects", {
    name: "Project Alpha",
    description: "Our flagship project.",
  });
  checkStatus("Create project", projRes.status, 201);
  const project = projRes.body as { id: string; name: string; description: string; memberIds: string[] };
  result("Project", project);

  step("Add Alice as member");
  const addAliceRes = await request("POST", `/projects/${project.id}/members`, {
    userId: alice.id,
  });
  checkStatus("Add Alice to project", addAliceRes.status, 200);
  result("Project after adding Alice", addAliceRes.body);

  step("Add Bob as member");
  const addBobRes = await request("POST", `/projects/${project.id}/members`, {
    userId: bob.id,
  });
  checkStatus("Add Bob to project", addBobRes.status, 200);
  result("Project after adding Bob", addBobRes.body);

  step("Try adding Alice again (should fail)");
  const dupMemberRes = await request("POST", `/projects/${project.id}/members`, {
    userId: alice.id,
  });
  checkStatus("Duplicate member → 400", dupMemberRes.status, 400);
  result("Error", dupMemberRes.body);

  step("Remove Bob from project");
  const removeBobRes = await request("DELETE", `/projects/${project.id}/members/${bob.id}`);
  checkStatus("Remove Bob", removeBobRes.status, 200);
  result("Project after removing Bob", removeBobRes.body);

  step("Get project by ID");
  const getProjectRes = await request("GET", `/projects/${project.id}`);
  checkStatus("Get project", getProjectRes.status, 200);
  result("Project", getProjectRes.body);

  // ── 3. Tasks ──────────────────────────────────────────────────────────────
  section("3. Task Management");

  step("Create task T1 in project Alpha");
  const t1Res = await request("POST", "/tasks", {
    title: "Design database schema",
    description: "Model all entities and relationships.",
    projectId: project.id,
  });
  checkStatus("Create task T1", t1Res.status, 201);
  const t1 = t1Res.body as { id: string; title: string; status: string; assigneeId: string | null };
  result("Task T1", t1);

  step("Create task T2 in project Alpha");
  const t2Res = await request("POST", "/tasks", {
    title: "Implement REST API",
    description: "Build all CRUD endpoints.",
    projectId: project.id,
  });
  checkStatus("Create task T2", t2Res.status, 201);
  const t2 = t2Res.body as { id: string; title: string; status: string; assigneeId: string | null };
  result("Task T2", t2);

  step("List tasks for project Alpha");
  const tasksRes = await request("GET", `/tasks?projectId=${project.id}`);
  checkStatus("List tasks", tasksRes.status, 200);
  result("Tasks", tasksRes.body);

  step("Assign T1 to Alice (generates notification)");
  const assignT1Res = await request("PUT", `/tasks/${t1.id}/assign`, {
    userId: alice.id,
  });
  checkStatus("Assign T1 to Alice", assignT1Res.status, 200);
  result("Task T1 after assignment", assignT1Res.body);

  step("Assign T2 to Bob (generates notification)");
  const assignT2Res = await request("PUT", `/tasks/${t2.id}/assign`, {
    userId: bob.id,
  });
  checkStatus("Assign T2 to Bob", assignT2Res.status, 200);
  result("Task T2 after assignment", assignT2Res.body);

  step("Advance T1 status: todo → in-progress (generates notification)");
  const statusRes1 = await request("PUT", `/tasks/${t1.id}/status`, {
    status: "in-progress",
  });
  checkStatus("T1 → in-progress", statusRes1.status, 200);
  result("Task T1", statusRes1.body);

  step("Advance T1 status: in-progress → done (generates notification)");
  const statusRes2 = await request("PUT", `/tasks/${t1.id}/status`, {
    status: "done",
  });
  checkStatus("T1 → done", statusRes2.status, 200);
  result("Task T1", statusRes2.body);

  step("Try illegal status transition: done → todo (should fail)");
  const badStatusRes = await request("PUT", `/tasks/${t1.id}/status`, {
    status: "todo",
  });
  checkStatus("Illegal transition → 400", badStatusRes.status, 400);
  result("Error", badStatusRes.body);

  step("Update T2 title");
  const updateT2Res = await request("PUT", `/tasks/${t2.id}`, {
    title: "Implement REST API (revised)",
  });
  checkStatus("Update T2", updateT2Res.status, 200);
  result("Task T2", updateT2Res.body);

  // ── 4. Comments ───────────────────────────────────────────────────────────
  section("4. Comments");

  step("Carol adds a comment to T2 (Bob is assignee → notification generated)");
  const c1Res = await request("POST", "/comments", {
    taskId: t2.id,
    authorId: carol.id,
    body: "Have you considered using REST best practices for this?",
  });
  checkStatus("Carol's comment", c1Res.status, 201);
  const c1 = c1Res.body as { id: string };
  result("Comment", c1Res.body);

  step("Alice adds a comment to T2");
  const c2Res = await request("POST", "/comments", {
    taskId: t2.id,
    authorId: alice.id,
    body: "I agree with Carol — let's follow the OpenAPI spec.",
  });
  checkStatus("Alice's comment", c2Res.status, 201);
  result("Comment", c2Res.body);

  step("Bob comments on his own task (no self-notification)");
  const c3Res = await request("POST", "/comments", {
    taskId: t2.id,
    authorId: bob.id,
    body: "Already on it — will have a draft by Friday.",
  });
  checkStatus("Bob's comment", c3Res.status, 201);
  result("Comment", c3Res.body);

  step("List all comments on T2");
  const commentsRes = await request("GET", `/comments?taskId=${t2.id}`);
  checkStatus("List comments", commentsRes.status, 200);
  result("Comments", commentsRes.body);

  step("Delete Carol's comment");
  const deleteCommentRes = await request("DELETE", `/comments/${c1.id}`);
  checkStatus("Delete comment", deleteCommentRes.status, 204);
  console.log(`  ${GREEN}✔${RESET} Comment deleted (204 No Content)`);

  // ── 5. Notifications ──────────────────────────────────────────────────────
  section("5. Notifications");

  step("Get all notifications for Alice");
  const aliceNotifRes = await request("GET", `/notifications?userId=${alice.id}`);
  checkStatus("Alice's notifications", aliceNotifRes.status, 200);
  result("Alice's notifications", aliceNotifRes.body);

  step("Get all notifications for Bob");
  const bobNotifRes = await request("GET", `/notifications?userId=${bob.id}`);
  checkStatus("Bob's notifications", bobNotifRes.status, 200);
  result("Bob's notifications", bobNotifRes.body);

  step("Mark first of Bob's notifications as read");
  const bobNotifs = bobNotifRes.body as Array<{ id: string; read: boolean }>;
  if (bobNotifs.length > 0) {
    const firstId = bobNotifs[0].id;
    const markReadRes = await request("PUT", `/notifications/${firstId}/read`);
    checkStatus("Mark as read", markReadRes.status, 200);
    result("Updated notification", markReadRes.body);
  } else {
    console.log("  (No notifications to mark as read)");
  }

  step("Get all notifications (no filter)");
  const allNotifRes = await request("GET", "/notifications");
  checkStatus("All notifications", allNotifRes.status, 200);
  const allNotifs = allNotifRes.body as unknown[];
  console.log(`  ${GREEN}✔${RESET} Total notifications: ${allNotifs.length}`);

  // ── 6. Error handling ─────────────────────────────────────────────────────
  section("6. Error Handling");

  step("GET /users/:id with non-existent ID");
  const missing = await request("GET", "/users/does-not-exist");
  checkStatus("Missing user → 404", missing.status, 404);
  result("Error", missing.body);

  step("GET /tasks/:id with non-existent ID");
  const missingTask = await request("GET", "/tasks/does-not-exist");
  checkStatus("Missing task → 404", missingTask.status, 404);
  result("Error", missingTask.body);

  step("POST /tasks without required projectId");
  const noProjectTask = await request("POST", "/tasks", {
    title: "Orphan task",
  });
  checkStatus("Missing projectId → 400", noProjectTask.status, 400);
  result("Error", noProjectTask.body);

  step("POST /users with invalid email");
  const badEmail = await request("POST", "/users", {
    name: "Bad Email User",
    email: "not-an-email",
  });
  checkStatus("Invalid email → 400", badEmail.status, 400);
  result("Error", badEmail.body);

  step("PUT /tasks/:id/status with bad transition");
  const badTransition = await request("PUT", `/tasks/${t2.id}/status`, {
    status: "todo", // t2 is still in todo — set it to in-progress first
  });
  // t2 is still in todo status so this is a no-op (same status), but let's
  // test the real illegal transition on the done task
  const t2StatusCheck = await request("PUT", `/tasks/${t2.id}/status`, {
    status: "in-progress",
  });
  checkStatus("T2 → in-progress", t2StatusCheck.status, 200);

  const t2IllegalRes = await request("PUT", `/tasks/${t2.id}/status`, {
    status: "todo",
  });
  checkStatus("T2 in-progress → todo (illegal) → 400", t2IllegalRes.status, 400);
  result("Error", t2IllegalRes.body);

  // ── 7. Cascade delete ─────────────────────────────────────────────────────
  section("7. Cascade Delete");

  step("Create a second project with tasks to delete");
  const proj2Res = await request("POST", "/projects", { name: "Temp Project", description: "" });
  checkStatus("Create Temp Project", proj2Res.status, 201);
  const proj2 = proj2Res.body as { id: string };

  const tempTaskRes = await request("POST", "/tasks", {
    title: "Temp Task",
    description: "",
    projectId: proj2.id,
  });
  checkStatus("Create Temp Task", tempTaskRes.status, 201);
  const tempTask = tempTaskRes.body as { id: string };

  await request("POST", "/comments", {
    taskId: tempTask.id,
    authorId: alice.id,
    body: "A comment that will be cascade-deleted.",
  });

  step("Delete the project (cascades to tasks and comments)");
  const deleteProjRes = await request("DELETE", `/projects/${proj2.id}`);
  checkStatus("Delete project", deleteProjRes.status, 204);
  console.log(`  ${GREEN}✔${RESET} Project deleted (204 No Content)`);

  step("Confirm task is gone");
  const goneTTask = await request("GET", `/tasks/${tempTask.id}`);
  checkStatus("Task after cascade delete → 404", goneTTask.status, 404);
  result("Error", goneTTask.body);

  // ── Summary ───────────────────────────────────────────────────────────────
  section("Demo Complete");
  console.log(`\n${GREEN}${BOLD}All scenarios passed! ✔${RESET}\n`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

server.listen(DEMO_PORT, async () => {
  try {
    await runDemo();
  } catch (err) {
    console.error(`\n${RED}Demo failed:${RESET}`, err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log("Server closed. Goodbye!\n");
    });
  }
});
