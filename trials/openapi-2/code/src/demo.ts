/**
 * Demo script — exercises every API endpoint end-to-end.
 *
 * Run with:  npx tsx src/demo.ts
 *
 * The script starts the HTTP server, runs the full scenario, prints a
 * pass/fail summary, then shuts down the server.
 */

import { createServer } from "http";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

// ── Bootstrap ────────────────────────────────────────────────────────────────

const PORT = 3001;

const userSvc = new UserService();
const projectSvc = new ProjectService();
const taskSvc = new TaskService();
const commentSvc = new CommentService();
const notifSvc = new NotificationService();
const router = new Router(userSvc, projectSvc, taskSvc, commentSvc, notifSvc);

const server = createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error("[Server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
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
    const options = {
      hostname: "localhost",
      port: PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = require("http").request(options, (res: import("http").IncomingMessage) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) as T });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: data as unknown as T });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ PASS  ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Demo scenario ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Task Management API — End-to-End Demo");
  console.log("══════════════════════════════════════════════\n");

  // ── 1. Create users ──────────────────────────────────────────────────────
  console.log("── 1. Create users ─────────────────────────");

  const aliceRes = await request("POST", "/users", { name: "Alice", email: "alice@example.com" });
  assert("POST /users → 201", aliceRes.status === 201);
  const alice = aliceRes.body as { id: string; name: string; email: string };
  assert("Alice has an id", typeof alice.id === "string" && alice.id.length > 0);

  const bobRes = await request("POST", "/users", { name: "Bob", email: "bob@example.com" });
  assert("POST /users → 201", bobRes.status === 201);
  const bob = bobRes.body as { id: string; name: string; email: string };

  // List users
  const usersRes = await request("GET", "/users");
  assert("GET /users → 200", usersRes.status === 200);
  assert("Two users listed", (usersRes.body as unknown[]).length === 2);

  // Get single user
  const aliceGetRes = await request("GET", `/users/${alice.id}`);
  assert("GET /users/:id → 200", aliceGetRes.status === 200);

  // Update user
  const aliceUpdRes = await request("PUT", `/users/${alice.id}`, { name: "Alice Updated" });
  assert("PUT /users/:id → 200", aliceUpdRes.status === 200);
  assert(
    "Name updated",
    (aliceUpdRes.body as { name: string }).name === "Alice Updated"
  );

  // Unknown user
  const missingUserRes = await request("GET", "/users/non-existent-id");
  assert("GET /users/:id unknown → 404", missingUserRes.status === 404);

  console.log();

  // ── 2. Create project ────────────────────────────────────────────────────
  console.log("── 2. Create project ───────────────────────");

  const projRes = await request("POST", "/projects", {
    name: "Apollo",
    description: "Moon landing project",
  });
  assert("POST /projects → 201", projRes.status === 201);
  const project = projRes.body as { id: string; name: string; memberIds: string[] };
  assert("Project has id", typeof project.id === "string");
  assert("Project starts with no members", project.memberIds.length === 0);

  // List projects
  const projListRes = await request("GET", "/projects");
  assert("GET /projects → 200", projListRes.status === 200);
  assert("One project listed", (projListRes.body as unknown[]).length === 1);

  // Get project
  const projGetRes = await request("GET", `/projects/${project.id}`);
  assert("GET /projects/:id → 200", projGetRes.status === 200);

  // Update project
  const projUpdRes = await request("PUT", `/projects/${project.id}`, { description: "Revised description" });
  assert("PUT /projects/:id → 200", projUpdRes.status === 200);
  assert(
    "Description updated",
    (projUpdRes.body as { description: string }).description === "Revised description"
  );

  console.log();

  // ── 3. Add members to project ────────────────────────────────────────────
  console.log("── 3. Add members to project ───────────────");

  const addAliceRes = await request("POST", `/projects/${project.id}/members`, { userId: alice.id });
  assert("POST /projects/:id/members (Alice) → 200", addAliceRes.status === 200);
  assert(
    "Alice is a member",
    (addAliceRes.body as { memberIds: string[] }).memberIds.includes(alice.id)
  );

  const addBobRes = await request("POST", `/projects/${project.id}/members`, { userId: bob.id });
  assert("POST /projects/:id/members (Bob) → 200", addBobRes.status === 200);
  assert(
    "Both members present",
    (addBobRes.body as { memberIds: string[] }).memberIds.length === 2
  );

  // Idempotent add
  const addAliceAgainRes = await request("POST", `/projects/${project.id}/members`, { userId: alice.id });
  assert("Idempotent member add → 200", addAliceAgainRes.status === 200);
  assert(
    "Still two members after duplicate add",
    (addAliceAgainRes.body as { memberIds: string[] }).memberIds.length === 2
  );

  console.log();

  // ── 4. Create tasks ──────────────────────────────────────────────────────
  console.log("── 4. Create tasks ─────────────────────────");

  const task1Res = await request("POST", "/tasks", {
    title: "Design navigation module",
    description: "Draft the lunar navigation algorithm",
    projectId: project.id,
  });
  assert("POST /tasks → 201", task1Res.status === 201);
  const task1 = task1Res.body as { id: string; status: string; assigneeId: string | null };
  assert("Task status starts as todo", task1.status === "todo");
  assert("Task has no assignee", task1.assigneeId === null);

  const task2Res = await request("POST", "/tasks", {
    title: "Build propulsion system",
    description: "Implement the main engine controls",
    projectId: project.id,
  });
  assert("POST /tasks → 201", task2Res.status === 201);
  const task2 = task2Res.body as { id: string; status: string };

  // List tasks by project
  const tasksListRes = await request("GET", `/tasks?projectId=${project.id}`);
  assert("GET /tasks?projectId → 200", tasksListRes.status === 200);
  assert("Two tasks in project", (tasksListRes.body as unknown[]).length === 2);

  // Get task
  const task1GetRes = await request("GET", `/tasks/${task1.id}`);
  assert("GET /tasks/:id → 200", task1GetRes.status === 200);

  // Update task
  const task1UpdRes = await request("PUT", `/tasks/${task1.id}`, { title: "Design navigation module v2" });
  assert("PUT /tasks/:id → 200", task1UpdRes.status === 200);
  assert(
    "Title updated",
    (task1UpdRes.body as { title: string }).title === "Design navigation module v2"
  );

  // Missing tasks
  const missingTaskRes = await request("GET", "/tasks/does-not-exist");
  assert("GET /tasks/:id unknown → 404", missingTaskRes.status === 404);

  // Missing projectId query param
  const noProjectIdRes = await request("GET", "/tasks");
  assert("GET /tasks without projectId → 400", noProjectIdRes.status === 400);

  console.log();

  // ── 5. Assign tasks ──────────────────────────────────────────────────────
  console.log("── 5. Assign tasks ─────────────────────────");

  const assignRes = await request("PUT", `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
  assert("PUT /tasks/:id/assign → 200", assignRes.status === 200);
  assert(
    "Task assigned to Alice",
    (assignRes.body as { assigneeId: string }).assigneeId === alice.id
  );

  const assignBobRes = await request("PUT", `/tasks/${task2.id}/assign`, { assigneeId: bob.id });
  assert("PUT /tasks/:id/assign (Bob) → 200", assignBobRes.status === 200);

  console.log();

  // ── 6. Change task status (forward-only) ─────────────────────────────────
  console.log("── 6. Status transitions ───────────────────");

  // todo → in-progress ✅
  const toInProgressRes = await request("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" });
  assert("todo → in-progress → 200", toInProgressRes.status === 200);
  assert(
    "Status is in-progress",
    (toInProgressRes.body as { status: string }).status === "in-progress"
  );

  // in-progress → done ✅
  const toDoneRes = await request("PUT", `/tasks/${task1.id}/status`, { status: "done" });
  assert("in-progress → done → 200", toDoneRes.status === 200);
  assert(
    "Status is done",
    (toDoneRes.body as { status: string }).status === "done"
  );

  // done → todo ❌ (backward)
  const backwardRes = await request("PUT", `/tasks/${task1.id}/status`, { status: "todo" });
  assert("done → todo → 400 (terminal state)", backwardRes.status === 400);

  // todo → done ❌ (skip in-progress)
  const skipRes = await request("PUT", `/tasks/${task2.id}/status`, { status: "done" });
  assert("todo → done → 400 (skip not allowed)", skipRes.status === 400);

  // todo → in-progress ✅ for task2
  const task2InProgressRes = await request("PUT", `/tasks/${task2.id}/status`, { status: "in-progress" });
  assert("task2: todo → in-progress → 200", task2InProgressRes.status === 200);

  console.log();

  // ── 7. Add comments ──────────────────────────────────────────────────────
  console.log("── 7. Add comments ─────────────────────────");

  const comment1Res = await request("POST", "/comments", {
    taskId: task1.id,
    authorId: alice.id,
    body: "Navigation module is complete!",
  });
  assert("POST /comments → 201", comment1Res.status === 201);
  const comment1 = comment1Res.body as { id: string; taskId: string; authorId: string; createdAt: string };
  assert("Comment linked to task", comment1.taskId === task1.id);
  assert("Comment has createdAt", typeof comment1.createdAt === "string");

  const comment2Res = await request("POST", "/comments", {
    taskId: task1.id,
    authorId: bob.id,
    body: "Looks great, merging now.",
  });
  assert("POST /comments (Bob) → 201", comment2Res.status === 201);
  const comment2 = comment2Res.body as { id: string };

  // Comment on task with unknown task id
  const badCommentRes = await request("POST", "/comments", {
    taskId: "no-such-task",
    authorId: alice.id,
    body: "Ghost comment",
  });
  assert("POST /comments unknown task → 404", badCommentRes.status === 404);

  // List comments by task
  const commentsListRes = await request("GET", `/comments?taskId=${task1.id}`);
  assert("GET /comments?taskId → 200", commentsListRes.status === 200);
  assert("Two comments on task", (commentsListRes.body as unknown[]).length === 2);

  // Get comment by id
  const commentGetRes = await request("GET", `/comments/${comment1.id}`);
  assert("GET /comments/:id → 200", commentGetRes.status === 200);

  // Missing taskId query param
  const noTaskIdRes = await request("GET", "/comments");
  assert("GET /comments without taskId → 400", noTaskIdRes.status === 400);

  // Delete comment
  const commentDelRes = await request("DELETE", `/comments/${comment2.id}`);
  assert("DELETE /comments/:id → 204", commentDelRes.status === 204);

  const commentsAfterDelRes = await request("GET", `/comments?taskId=${task1.id}`);
  assert(
    "One comment remains after delete",
    (commentsAfterDelRes.body as unknown[]).length === 1
  );

  console.log();

  // ── 8. Check notifications ────────────────────────────────────────────────
  console.log("── 8. Notifications ────────────────────────");

  // Alice should have notifications:
  //   • Assigned to task1         (task.assigned)
  //   • task1 in-progress         (task.statusChanged)
  //   • task1 done                (task.statusChanged)
  //   • Posted comment on task1   (comment.added)
  const aliceNotifsRes = await request("GET", `/notifications?userId=${alice.id}`);
  assert("GET /notifications?userId (Alice) → 200", aliceNotifsRes.status === 200);
  const aliceNotifs = aliceNotifsRes.body as Array<{ id: string; message: string; read: boolean }>;
  assert("Alice has ≥ 4 notifications", aliceNotifs.length >= 4, `got ${aliceNotifs.length}`);
  assert("Notifications unread by default", aliceNotifs.every((n) => !n.read));

  // Bob should have notifications:
  //   • Assigned to task2         (task.assigned)
  //   • Posted comment on task1   (comment.added)
  const bobNotifsRes = await request("GET", `/notifications?userId=${bob.id}`);
  assert("GET /notifications?userId (Bob) → 200", bobNotifsRes.status === 200);
  const bobNotifs = bobNotifsRes.body as Array<{ id: string; read: boolean }>;
  assert("Bob has ≥ 2 notifications", bobNotifs.length >= 2, `got ${bobNotifs.length}`);

  // Missing userId
  const noUserIdRes = await request("GET", "/notifications");
  assert("GET /notifications without userId → 400", noUserIdRes.status === 400);

  // Mark a notification as read
  const firstNotif = aliceNotifs[0];
  const markReadRes = await request("PUT", `/notifications/${firstNotif.id}/read`);
  assert("PUT /notifications/:id/read → 200", markReadRes.status === 200);
  assert(
    "Notification is now read",
    (markReadRes.body as { read: boolean }).read === true
  );

  // Unknown notification
  const missingNotifRes = await request("PUT", "/notifications/unknown-id/read");
  assert("PUT /notifications/unknown/read → 404", missingNotifRes.status === 404);

  // Verify read state persists
  const aliceNotifsAfterRes = await request("GET", `/notifications?userId=${alice.id}`);
  const aliceNotifsAfter = aliceNotifsAfterRes.body as Array<{ id: string; read: boolean }>;
  const readNotif = aliceNotifsAfter.find((n) => n.id === firstNotif.id);
  assert("Read state persists", readNotif?.read === true);

  console.log();

  // ── 9. Remove member & delete project/user ───────────────────────────────
  console.log("── 9. Remove member / cleanup ──────────────");

  const removeMemberRes = await request("DELETE", `/projects/${project.id}/members`, { userId: bob.id });
  assert("DELETE /projects/:id/members → 200", removeMemberRes.status === 200);
  assert(
    "Bob removed from project",
    !(removeMemberRes.body as { memberIds: string[] }).memberIds.includes(bob.id)
  );

  // Delete the second task
  const task2DelRes = await request("DELETE", `/tasks/${task2.id}`);
  assert("DELETE /tasks/:id → 204", task2DelRes.status === 204);

  const deletedTaskRes = await request("GET", `/tasks/${task2.id}`);
  assert("Deleted task returns 404", deletedTaskRes.status === 404);

  // Delete project
  const projDelRes = await request("DELETE", `/projects/${project.id}`);
  assert("DELETE /projects/:id → 204", projDelRes.status === 204);

  const deletedProjRes = await request("GET", `/projects/${project.id}`);
  assert("Deleted project returns 404", deletedProjRes.status === 404);

  // Delete user
  const userDelRes = await request("DELETE", `/users/${bob.id}`);
  assert("DELETE /users/:id → 204", userDelRes.status === 204);

  const deletedUserRes = await request("GET", `/users/${bob.id}`);
  assert("Deleted user returns 404", deletedUserRes.status === 404);

  console.log();

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("══════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

server.listen(PORT, async () => {
  console.log(`[Demo] Server listening on http://localhost:${PORT}`);
  try {
    await run();
  } catch (err) {
    console.error("[Demo] Unexpected error:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
