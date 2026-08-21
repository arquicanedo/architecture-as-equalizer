/**
 * Demo script — exercises every feature of the Task Management API.
 *
 * Flow:
 *   1.  Start the HTTP server (in-process)
 *   2.  Create two users (Alice, Bob)
 *   3.  Create a project and add both users as members
 *   4.  Create two tasks in that project
 *   5.  Assign tasks to Alice       → task.assigned event → notifications
 *   6.  Change task status          → task.statusChanged event → notifications
 *   7.  Bob adds comments on a task → comment.added event → notifications
 *   8.  Read Alice's notifications
 *   9.  Mark a notification as read
 *   10. Remove member, delete comment, delete task, delete project
 *   11. Verify invalid status transitions are rejected
 *   12. Verify 404 / error responses
 */

import http, { IncomingMessage, ServerResponse } from "http";
import { eventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

// ─── Bootstrap (same pattern as main.ts, different port) ─────────────────────

const PORT = 3001;
const BASE = `http://127.0.0.1:${PORT}`;

const userService = new UserService();
const projectService = new ProjectService();
const notificationService = new NotificationService(eventBus);
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);

const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  router.handle(req, res).catch((err) => {
    console.error("[Server] Unhandled:", err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

// ─── Minimal HTTP client ──────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function request<T = unknown>(
  method: string,
  path: string,
  payload?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const bodyStr = payload !== undefined ? JSON.stringify(payload) : undefined;
    const url = new URL(path, BASE);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr !== undefined
          ? { "Content-Length": Buffer.byteLength(bodyStr) }
          : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const body = JSON.parse(
            Buffer.concat(chunks).toString("utf8")
          ) as T;
          resolve({ status: res.statusCode ?? 0, body });
        } catch {
          reject(new Error("Failed to parse response JSON"));
        }
      });
    });

    req.on("error", reject);
    if (bodyStr !== undefined) req.write(bodyStr);
    req.end();
  });
}

// ─── Logging helpers ──────────────────────────────────────────────────────────

const RESET  = "\x1b[0m";
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const YELLOW = "\x1b[33m";
const BOLD   = "\x1b[1m";

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}${"─".repeat(62)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${"─".repeat(62)}${RESET}`);
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/\n/g, "\n      ");
}

function assert(condition: boolean, label: string, detail?: unknown): void {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET}  ${label}`);
    if (detail !== undefined && detail !== "") {
      console.log(`      ${prettyJson(detail)}`);
    }
  } else {
    console.log(`  ${RED}✗${RESET}  ${label}`);
    if (detail !== undefined) {
      console.log(`      ${prettyJson(detail)}`);
    }
    process.exitCode = 1;
  }
}

function info(msg: string): void {
  console.log(`  ${YELLOW}→${RESET}  ${msg}`);
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {

  // ── 1. Users ─────────────────────────────────────────────────────────────
  section("1. Create users");

  const aliceRes = await request<Record<string, unknown>>("POST", "/users", {
    name: "Alice",
    email: "alice@example.com",
  });
  assert(aliceRes.status === 201, "Create Alice (201)", aliceRes.body);
  const alice = aliceRes.body;

  const bobRes = await request<Record<string, unknown>>("POST", "/users", {
    name: "Bob",
    email: "bob@example.com",
  });
  assert(bobRes.status === 201, "Create Bob (201)", bobRes.body);
  const bob = bobRes.body;

  const allUsersRes = await request<unknown[]>("GET", "/users");
  assert(
    allUsersRes.status === 200 && allUsersRes.body.length === 2,
    "GET /users returns 2 users"
  );

  const getUserRes = await request("GET", `/users/${String(alice.id)}`);
  assert(getUserRes.status === 200, `GET /users/:id (200)`, getUserRes.body);

  const updateUserRes = await request<Record<string, unknown>>(
    "PUT",
    `/users/${String(alice.id)}`,
    { name: "Alice A." }
  );
  assert(
    updateUserRes.status === 200 && updateUserRes.body.name === "Alice A.",
    "PUT /users/:id — update Alice's name",
    updateUserRes.body
  );
  // Update alice object in memory
  alice.name = "Alice A.";

  // ── 2. Project ───────────────────────────────────────────────────────────
  section("2. Create project");

  const projRes = await request<Record<string, unknown>>("POST", "/projects", {
    name: "Apollo",
    description: "Mission to ship v1",
  });
  assert(projRes.status === 201, "Create project Apollo (201)", projRes.body);
  const project = projRes.body;

  const allProjRes = await request<unknown[]>("GET", "/projects");
  assert(allProjRes.status === 200 && allProjRes.body.length === 1, "GET /projects returns 1");

  const getProjRes = await request("GET", `/projects/${String(project.id)}`);
  assert(getProjRes.status === 200, "GET /projects/:id (200)", getProjRes.body);

  const updateProjRes = await request<Record<string, unknown>>(
    "PUT",
    `/projects/${String(project.id)}`,
    { description: "Mission to ship v1.0" }
  );
  assert(
    updateProjRes.status === 200 &&
      updateProjRes.body.description === "Mission to ship v1.0",
    "PUT /projects/:id — update description",
    updateProjRes.body
  );

  // ── 3. Members ───────────────────────────────────────────────────────────
  section("3. Add / remove project members");

  const addAliceRes = await request<Record<string, unknown>>(
    "POST",
    `/projects/${String(project.id)}/members`,
    { userId: alice.id }
  );
  assert(
    addAliceRes.status === 200 &&
      (addAliceRes.body.memberIds as string[]).includes(String(alice.id)),
    "POST /projects/:id/members — add Alice",
    addAliceRes.body
  );

  const addBobRes = await request<Record<string, unknown>>(
    "POST",
    `/projects/${String(project.id)}/members`,
    { userId: bob.id }
  );
  assert(addBobRes.status === 200, "POST /projects/:id/members — add Bob", addBobRes.body);

  // Duplicate member → 409
  const dupRes = await request(
    "POST",
    `/projects/${String(project.id)}/members`,
    { userId: alice.id }
  );
  assert(dupRes.status === 409, "Duplicate member → 409", dupRes.body);

  // ── 4. Tasks ─────────────────────────────────────────────────────────────
  section("4. Create tasks");

  const task1Res = await request<Record<string, unknown>>("POST", "/tasks", {
    title: "Design database schema",
    description: "ERD for all entities",
    projectId: project.id,
  });
  assert(task1Res.status === 201, "Create task 1 (201)", task1Res.body);
  const task1 = task1Res.body;

  const task2Res = await request<Record<string, unknown>>("POST", "/tasks", {
    title: "Implement API router",
    description: "HTTP routing layer",
    projectId: project.id,
  });
  assert(task2Res.status === 201, "Create task 2 (201)", task2Res.body);
  const task2 = task2Res.body;

  const byProjectRes = await request<unknown[]>(
    "GET",
    `/tasks?projectId=${String(project.id)}`
  );
  assert(
    byProjectRes.status === 200 && byProjectRes.body.length === 2,
    "GET /tasks?projectId returns 2 tasks"
  );

  const getTaskRes = await request("GET", `/tasks/${String(task1.id)}`);
  assert(getTaskRes.status === 200, "GET /tasks/:id (200)", getTaskRes.body);

  const updateTaskRes = await request<Record<string, unknown>>(
    "PUT",
    `/tasks/${String(task1.id)}`,
    { title: "Design DB schema (v2)" }
  );
  assert(
    updateTaskRes.status === 200 && updateTaskRes.body.title === "Design DB schema (v2)",
    "PUT /tasks/:id — update title",
    updateTaskRes.body
  );

  // ── 5. Assign tasks ──────────────────────────────────────────────────────
  section("5. Assign tasks → task.assigned event → notifications");

  info("Assigning task 1 to Alice…");
  const assign1Res = await request<Record<string, unknown>>(
    "PUT",
    `/tasks/${String(task1.id)}/assign`,
    { assigneeId: alice.id }
  );
  assert(
    assign1Res.status === 200 && assign1Res.body.assigneeId === alice.id,
    "PUT /tasks/:id/assign — task 1 → Alice",
    assign1Res.body
  );

  info("Assigning task 2 to Alice…");
  const assign2Res = await request<Record<string, unknown>>(
    "PUT",
    `/tasks/${String(task2.id)}/assign`,
    { assigneeId: alice.id }
  );
  assert(assign2Res.status === 200, "PUT /tasks/:id/assign — task 2 → Alice", assign2Res.body);

  const notifsAfterAssign = await request<unknown[]>(
    "GET",
    `/notifications?userId=${String(alice.id)}`
  );
  assert(
    notifsAfterAssign.status === 200 && notifsAfterAssign.body.length >= 2,
    `Alice has ≥ 2 notifications after assignment (has ${notifsAfterAssign.body.length})`
  );

  // ── 6. Status transitions ────────────────────────────────────────────────
  section("6. Task status transitions");

  const toInProgressRes = await request<Record<string, unknown>>(
    "PUT",
    `/tasks/${String(task1.id)}/status`,
    { status: "in-progress" }
  );
  assert(
    toInProgressRes.status === 200 && toInProgressRes.body.status === "in-progress",
    "PUT /tasks/:id/status — todo → in-progress",
    toInProgressRes.body
  );

  const toDoneRes = await request<Record<string, unknown>>(
    "PUT",
    `/tasks/${String(task1.id)}/status`,
    { status: "done" }
  );
  assert(
    toDoneRes.status === 200 && toDoneRes.body.status === "done",
    "PUT /tasks/:id/status — in-progress → done",
    toDoneRes.body
  );

  info("Attempting backward transition: done → todo (should fail)…");
  const backwardRes = await request(
    "PUT",
    `/tasks/${String(task1.id)}/status`,
    { status: "todo" }
  );
  assert(backwardRes.status === 400, "Backward transition rejected (400)", backwardRes.body);

  info("Attempting skip transition: todo → done (should fail)…");
  const skipRes = await request(
    "PUT",
    `/tasks/${String(task2.id)}/status`,
    { status: "done" }
  );
  assert(skipRes.status === 400, "Skip transition rejected (400)", skipRes.body);

  const notifsAfterStatus = await request<unknown[]>(
    "GET",
    `/notifications?userId=${String(alice.id)}`
  );
  assert(
    notifsAfterStatus.body.length >= 4,
    `Alice has ≥ 4 notifications after status changes (has ${notifsAfterStatus.body.length})`
  );

  // ── 7. Comments ──────────────────────────────────────────────────────────
  section("7. Add comments → comment.added event → notifications");

  info("Bob comments on task 2 (assigned to Alice)…");
  const c1Res = await request<Record<string, unknown>>("POST", "/comments", {
    taskId: task2.id,
    authorId: bob.id,
    body: "Hey Alice, do you need help with the router?",
  });
  assert(c1Res.status === 201, "POST /comments (Bob → task 2)", c1Res.body);
  const comment1 = c1Res.body;

  const c2Res = await request<Record<string, unknown>>("POST", "/comments", {
    taskId: task2.id,
    authorId: bob.id,
    body: "I can pair with you on the path-matching logic.",
  });
  assert(c2Res.status === 201, "POST /comments — second comment", c2Res.body);

  const byTaskRes = await request<unknown[]>(
    "GET",
    `/comments?taskId=${String(task2.id)}`
  );
  assert(
    byTaskRes.status === 200 && byTaskRes.body.length === 2,
    "GET /comments?taskId returns 2 comments"
  );

  const getCommentRes = await request("GET", `/comments/${String(comment1.id)}`);
  assert(getCommentRes.status === 200, "GET /comments/:id (200)", getCommentRes.body);

  // ── 8. Notifications ─────────────────────────────────────────────────────
  section("8. Alice's notifications after all events");

  const aliceNotifsRes = await request<Array<Record<string, unknown>>>(
    "GET",
    `/notifications?userId=${String(alice.id)}`
  );
  assert(aliceNotifsRes.status === 200, "GET /notifications?userId (200)");
  const aliceNotifs = aliceNotifsRes.body;

  // Expected: 2 task.assigned + 2 task.statusChanged + 2 comment.added = 6
  assert(
    aliceNotifs.length >= 6,
    `Alice has ≥ 6 notifications (has ${aliceNotifs.length}): 2 assigned + 2 status + 2 comments`
  );

  const allUnread = aliceNotifs.every((n) => !n.read);
  assert(allUnread, "All notifications start as unread");

  console.log("\n  Notification messages:");
  aliceNotifs.forEach((n, i) => {
    console.log(`    ${i + 1}. ${n.message}`);
  });

  // ── 9. Mark as read ───────────────────────────────────────────────────────
  section("9. Mark notification as read");

  const firstId = String(aliceNotifs[0].id);
  const markReadRes = await request<Record<string, unknown>>(
    "PUT",
    `/notifications/${firstId}/read`
  );
  assert(
    markReadRes.status === 200 && markReadRes.body.read === true,
    "PUT /notifications/:id/read → read: true",
    markReadRes.body
  );

  const afterMarkRes = await request<Array<Record<string, unknown>>>(
    "GET",
    `/notifications?userId=${String(alice.id)}`
  );
  const unreadNow = afterMarkRes.body.filter((n) => !n.read).length;
  assert(
    unreadNow === aliceNotifs.length - 1,
    `Unread count decreased by 1 (now ${unreadNow})`
  );

  // ── 10. Remove member ─────────────────────────────────────────────────────
  section("10. Remove Bob from project");

  const removeBobRes = await request<Record<string, unknown>>(
    "DELETE",
    `/projects/${String(project.id)}/members`,
    { userId: bob.id }
  );
  assert(
    removeBobRes.status === 200 &&
      !(removeBobRes.body.memberIds as string[]).includes(String(bob.id)),
    "DELETE /projects/:id/members — Bob removed",
    removeBobRes.body
  );

  // ── 11. Delete comment ────────────────────────────────────────────────────
  section("11. Delete comment");

  const delComRes = await request("DELETE", `/comments/${String(comment1.id)}`);
  assert(delComRes.status === 200, "DELETE /comments/:id (200)", delComRes.body);

  const afterDelComRes = await request<unknown[]>(
    "GET",
    `/comments?taskId=${String(task2.id)}`
  );
  assert(
    afterDelComRes.body.length === 1,
    "One comment remains after deletion"
  );

  // ── 12. Error / 404 paths ─────────────────────────────────────────────────
  section("12. Error handling");

  const notFoundRes = await request("GET", "/users/no-such-id");
  assert(notFoundRes.status === 404, "GET /users/unknown → 404", notFoundRes.body);

  const badRouteRes = await request("GET", "/does-not-exist");
  assert(badRouteRes.status === 404, "Unknown route → 404", badRouteRes.body);

  const emptyUserRes = await request("POST", "/users", { name: "", email: "" });
  assert(emptyUserRes.status === 400, "POST /users with empty fields → 400", emptyUserRes.body);

  const noUserIdRes = await request("GET", "/notifications");
  assert(noUserIdRes.status === 400, "GET /notifications without userId → 400", noUserIdRes.body);

  const noTaskIdRes = await request("GET", "/comments");
  assert(noTaskIdRes.status === 400, "GET /comments without taskId → 400", noTaskIdRes.body);

  // ── 13. Clean up ──────────────────────────────────────────────────────────
  section("13. Clean up — delete task 2 and project");

  const delTask2Res = await request("DELETE", `/tasks/${String(task2.id)}`);
  assert(delTask2Res.status === 200, "DELETE /tasks/:id (200)", delTask2Res.body);

  const delProjRes = await request("DELETE", `/projects/${String(project.id)}`);
  assert(delProjRes.status === 200, "DELETE /projects/:id (200)", delProjRes.body);

  const finalProjRes = await request<unknown[]>("GET", "/projects");
  assert(finalProjRes.body.length === 0, "No projects remain");

  // Delete a user
  const delAliceRes = await request("DELETE", `/users/${String(alice.id)}`);
  assert(delAliceRes.status === 200, "DELETE /users/:id — delete Alice", delAliceRes.body);

  const finalUsersRes = await request<unknown[]>("GET", "/users");
  assert(finalUsersRes.body.length === 1, "One user remains (Bob)");

  // ── Summary ───────────────────────────────────────────────────────────────
  section("Demo complete");
  if (process.exitCode === 1) {
    console.log(`\n${RED}${BOLD}  Some assertions FAILED — see ✗ above.${RESET}\n`);
  } else {
    console.log(`\n${GREEN}${BOLD}  All assertions passed ✓${RESET}\n`);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, "127.0.0.1", () => {
  console.log(`${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║         Task Management API — Demo Script                    ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  Server: ${BASE}\n`);

  run()
    .catch((err) => {
      console.error(`${RED}Unexpected error during demo:${RESET}`, err);
      process.exitCode = 1;
    })
    .finally(() => {
      server.close();
    });
});
