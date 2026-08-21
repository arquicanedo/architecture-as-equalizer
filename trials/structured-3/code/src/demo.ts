/**
 * Demo Script
 * Starts the server programmatically and exercises every API endpoint,
 * validating the end-to-end flow described in the architecture spec.
 *
 * Run with: npx tsx src/demo.ts
 */

import * as http from "http";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { Router } from "./router";

// ── Colour helpers (ANSI) ────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  grey: "\x1b[90m",
};

function heading(text: string): void {
  console.log(`\n${C.bold}${C.cyan}══ ${text} ══${C.reset}`);
}

function ok(label: string, value?: unknown): void {
  const extra =
    value !== undefined ? `${C.grey} → ${JSON.stringify(value)}${C.reset}` : "";
  console.log(`  ${C.green}✓${C.reset} ${label}${extra}`);
}

function fail(label: string, reason: string): void {
  console.log(`  ${C.red}✗${C.reset} ${label}: ${reason}`);
}

function info(label: string, value: unknown): void {
  const formatted = JSON.stringify(value, null, 2)
    .split("\n")
    .join("\n    ");
  console.log(`  ${C.yellow}·${C.reset} ${label}: ${C.grey}${formatted}${C.reset}`);
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
const DEMO_PORT = 3001;

function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body !== undefined ? JSON.stringify(body) : "";
    const headers: http.OutgoingHttpHeaders = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
    };

    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: DEMO_PORT,
      path,
      method,
      headers,
    };

    const request = http.request(options, (res: IncomingMessage) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => { raw += chunk; });
      res.on("end", () => {
        try {
          const parsed = raw.trim() ? JSON.parse(raw) as T : ({} as T);
          resolve({ status: res.statusCode ?? 0, data: parsed });
        } catch (e) {
          reject(new Error(`Failed to parse response (${res.statusCode}): ${raw}`));
        }
      });
      res.on("error", reject);
    });

    request.on("error", reject);

    if (bodyStr) {
      request.write(bodyStr);
    }
    request.end();
  });
}

// ── Main demo ────────────────────────────────────────────────────────────────
async function runDemo(): Promise<void> {
  // ── Boot a fresh server ───────────────────────────────────────────────────
  const eventBus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService(eventBus);
  const router = new Router(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    router.handle(req, res).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "error";
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(DEMO_PORT, "127.0.0.1", resolve));
  console.log(`${C.bold}Task Management API Demo${C.reset} — server on 127.0.0.1:${DEMO_PORT}\n`);

  let passed = 0;
  let failed = 0;

  function assert(label: string, condition: boolean, extra?: unknown): void {
    if (condition) {
      ok(label, extra);
      passed++;
    } else {
      fail(label, `assertion failed — got ${JSON.stringify(extra)}`);
      failed++;
    }
  }

  try {
    // ── 1. Create users ─────────────────────────────────────────────────────
    heading("1. Create Users");

    const { data: alice } = await apiRequest<{ id: string; name: string; email: string }>(
      "POST", "/users", { name: "Alice", email: "alice@example.com" }
    );
    assert("Create Alice", !!alice.id && alice.name === "Alice", alice);

    const { data: bob } = await apiRequest<{ id: string; name: string; email: string }>(
      "POST", "/users", { name: "Bob", email: "bob@example.com" }
    );
    assert("Create Bob", !!bob.id && bob.name === "Bob", bob);

    const { data: allUsers } = await apiRequest<unknown[]>("GET", "/users");
    assert("GET /users returns 2 users", Array.isArray(allUsers) && allUsers.length === 2);

    const { data: fetchedAlice } = await apiRequest<{ id: string; name: string }>(
      "GET", `/users/${alice.id}`
    );
    assert("GET /users/:id returns Alice", fetchedAlice.name === "Alice");

    const { data: updatedAlice } = await apiRequest<{ name: string }>(
      "PUT", `/users/${alice.id}`, { name: "Alice A." }
    );
    assert("PUT /users/:id updates name", updatedAlice.name === "Alice A.");

    // ── 2. Create project ───────────────────────────────────────────────────
    heading("2. Create Project");

    const { data: project } = await apiRequest<{ id: string; name: string; memberIds: string[] }>(
      "POST", "/projects", { name: "Alpha", description: "The first project" }
    );
    assert("Create project Alpha", !!project.id && project.name === "Alpha", project);

    const { data: allProjects } = await apiRequest<unknown[]>("GET", "/projects");
    assert("GET /projects returns 1 project", Array.isArray(allProjects) && allProjects.length === 1);

    const { data: fetchedProject } = await apiRequest<{ id: string; name: string }>(
      "GET", `/projects/${project.id}`
    );
    assert("GET /projects/:id returns Alpha", fetchedProject.name === "Alpha");

    const { data: updatedProject } = await apiRequest<{ description: string }>(
      "PUT", `/projects/${project.id}`, { description: "Updated description" }
    );
    assert("PUT /projects/:id updates description", updatedProject.description === "Updated description");

    // ── 3. Add/remove members ───────────────────────────────────────────────
    heading("3. Add Members to Project");

    const { data: projWithAlice } = await apiRequest<{ memberIds: string[] }>(
      "POST", `/projects/${project.id}/members`, { userId: alice.id }
    );
    assert("Add Alice to project", projWithAlice.memberIds.includes(alice.id), projWithAlice.memberIds);

    const { data: projWithBoth } = await apiRequest<{ memberIds: string[] }>(
      "POST", `/projects/${project.id}/members`, { userId: bob.id }
    );
    assert("Add Bob to project", projWithBoth.memberIds.includes(bob.id), projWithBoth.memberIds);
    assert("Project has 2 members", projWithBoth.memberIds.length === 2);

    // Idempotent add
    const { data: projIdempotent } = await apiRequest<{ memberIds: string[] }>(
      "POST", `/projects/${project.id}/members`, { userId: alice.id }
    );
    assert("Adding Alice again is idempotent", projIdempotent.memberIds.length === 2);

    // Remove Bob
    const { data: projAfterRemove } = await apiRequest<{ memberIds: string[] }>(
      "DELETE", `/projects/${project.id}/members`, { userId: bob.id }
    );
    assert("Remove Bob from project", !projAfterRemove.memberIds.includes(bob.id));

    // Re-add Bob for later steps
    await apiRequest("POST", `/projects/${project.id}/members`, { userId: bob.id });
    ok("Re-added Bob to project for later steps");

    // ── 4. Create tasks ─────────────────────────────────────────────────────
    heading("4. Create Tasks");

    const { data: task1 } = await apiRequest<{
      id: string; title: string; status: string; assigneeId: string | null;
    }>("POST", "/tasks", {
      title: "Design schema",
      description: "Create DB schema",
      projectId: project.id,
    });
    assert("Create task1 (Design schema)", task1.status === "todo" && task1.assigneeId === null, task1);

    const { data: task2 } = await apiRequest<{ id: string; title: string; status: string }>(
      "POST", "/tasks", { title: "Implement API", projectId: project.id }
    );
    assert("Create task2 (Implement API)", !!task2.id && task2.status === "todo");

    const { data: tasksForProject } = await apiRequest<unknown[]>(
      "GET", `/tasks?projectId=${project.id}`
    );
    assert("GET /tasks?projectId returns 2 tasks", Array.isArray(tasksForProject) && tasksForProject.length === 2);

    const { data: fetchedTask } = await apiRequest<{ title: string }>(
      "GET", `/tasks/${task1.id}`
    );
    assert("GET /tasks/:id returns task1", fetchedTask.title === "Design schema");

    const { data: updatedTask } = await apiRequest<{ title: string }>(
      "PUT", `/tasks/${task1.id}`, { title: "Design DB schema" }
    );
    assert("PUT /tasks/:id updates title", updatedTask.title === "Design DB schema");

    // ── 5. Assign tasks ─────────────────────────────────────────────────────
    heading("5. Assign Tasks → triggers notifications");

    const { status: assignStatus, data: assignedTask } = await apiRequest<{
      id: string; assigneeId: string;
    }>("PUT", `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
    assert("PUT /tasks/:id/assign returns 200", assignStatus === 200);
    assert("Task1 assignee is Alice", assignedTask.assigneeId === alice.id);

    await apiRequest("PUT", `/tasks/${task2.id}/assign`, { assigneeId: bob.id });
    ok("Assigned task2 to Bob");

    // Alice should have a task.assigned notification
    const { data: aliceNotifs1 } = await apiRequest<
      Array<{ id: string; message: string; read: boolean; userId: string }>
    >("GET", `/notifications?userId=${alice.id}`);
    assert(
      "Alice received task.assigned notification",
      aliceNotifs1.some((n) => n.message.includes("Design DB schema"))
    );
    info("Alice notifications after assignment", aliceNotifs1.map((n) => n.message));

    // ── 6. Change task status ───────────────────────────────────────────────
    heading("6. Change Task Status (forward-only)");

    const { data: inProgress } = await apiRequest<{ status: string }>(
      "PUT", `/tasks/${task1.id}/status`, { status: "in-progress" }
    );
    assert("Task1 moved to in-progress", inProgress.status === "in-progress");

    const { data: aliceNotifs2 } = await apiRequest<Array<{ message: string }>>(
      "GET", `/notifications?userId=${alice.id}`
    );
    assert(
      "Alice received task.statusChanged notification",
      aliceNotifs2.some((n) => n.message.includes("in-progress"))
    );

    const { data: doneTask } = await apiRequest<{ status: string }>(
      "PUT", `/tasks/${task1.id}/status`, { status: "done" }
    );
    assert("Task1 moved to done", doneTask.status === "done");

    // Backward transition must fail
    const { status: backStatus, data: backErr } = await apiRequest<{ error: string }>(
      "PUT", `/tasks/${task1.id}/status`, { status: "todo" }
    );
    assert(
      "Backward transition rejected (422)",
      backStatus === 422,
      (backErr as { error: string }).error
    );

    // Skipping a step must fail (todo → done on task2)
    const { status: skipStatus, data: skipErr } = await apiRequest<{ error: string }>(
      "PUT", `/tasks/${task2.id}/status`, { status: "done" }
    );
    assert(
      "Skipping a status step rejected (422)",
      skipStatus === 422,
      (skipErr as { error: string }).error
    );

    // ── 7. Add comments ─────────────────────────────────────────────────────
    heading("7. Add Comments → triggers notifications");

    const { status: commentStatus, data: comment1 } = await apiRequest<{
      id: string; taskId: string; authorId: string; body: string; createdAt: string;
    }>("POST", "/comments", {
      taskId: task1.id,
      authorId: bob.id,
      body: "Great work on the schema!",
    });
    assert("POST /comments returns 201", commentStatus === 201);
    assert("Comment linked to task1", comment1.taskId === task1.id);

    // Alice is task1's assignee; Bob is the commenter → Alice gets notified
    const { data: aliceNotifs3 } = await apiRequest<Array<{ message: string }>>(
      "GET", `/notifications?userId=${alice.id}`
    );
    assert(
      "Alice notified of Bob's comment on her task",
      aliceNotifs3.some((n) => n.message.includes("Bob") && n.message.includes("commented"))
    );

    const { data: comment2 } = await apiRequest<{ id: string }>("POST", "/comments", {
      taskId: task2.id,
      authorId: alice.id,
      body: "Let me know if you need help.",
    });
    assert("Second comment created", !!comment2.id);

    // GET /comments?taskId
    const { data: task1Comments } = await apiRequest<unknown[]>(
      "GET", `/comments?taskId=${task1.id}`
    );
    assert("GET /comments?taskId returns 1 comment for task1", Array.isArray(task1Comments) && task1Comments.length === 1);

    const { data: fetchedComment } = await apiRequest<{ body: string }>(
      "GET", `/comments/${comment1.id}`
    );
    assert("GET /comments/:id returns correct comment", fetchedComment.body === "Great work on the schema!");

    // ── 8. Check all notifications ──────────────────────────────────────────
    heading("8. Check Notifications");

    const { data: allAliceNotifs } = await apiRequest<
      Array<{ id: string; message: string; read: boolean }>
    >("GET", `/notifications?userId=${alice.id}`);
    info(
      "All Alice notifications",
      allAliceNotifs.map((n) => ({ msg: n.message, read: n.read }))
    );
    assert("Alice has at least 3 notifications", allAliceNotifs.length >= 3);

    const { data: bobNotifs } = await apiRequest<
      Array<{ id: string; message: string; read: boolean }>
    >("GET", `/notifications?userId=${bob.id}`);
    info("All Bob notifications", bobNotifs.map((n) => ({ msg: n.message, read: n.read })));
    assert("Bob has at least 1 notification (task.assigned)", bobNotifs.length >= 1);

    // ── 9. Mark notification as read ────────────────────────────────────────
    heading("9. Mark Notification as Read");

    const firstNotifId = allAliceNotifs[0].id;
    const { data: readNotif } = await apiRequest<{ read: boolean }>(
      "PUT", `/notifications/${firstNotifId}/read`
    );
    assert("Notification marked as read", readNotif.read === true);

    // ── 10. Delete operations ───────────────────────────────────────────────
    heading("10. Delete Operations");

    const { data: delComment } = await apiRequest("DELETE", `/comments/${comment1.id}`);
    assert("DELETE /comments/:id", (delComment as { message: string }).message === "Comment deleted");

    // Verify comment is gone
    const { status: gone404 } = await apiRequest("GET", `/comments/${comment1.id}`);
    assert("Deleted comment returns 404", gone404 === 404);

    // Throwaway task
    const { data: throwawayTask } = await apiRequest<{ id: string }>("POST", "/tasks", {
      title: "Throwaway task",
      projectId: project.id,
    });
    const { data: delTask } = await apiRequest("DELETE", `/tasks/${throwawayTask.id}`);
    assert("DELETE /tasks/:id", (delTask as { message: string }).message === "Task deleted");

    // Throwaway user
    const { data: throwawayUser } = await apiRequest<{ id: string }>(
      "POST", "/users", { name: "Temp", email: "temp@example.com" }
    );
    const { data: delUser } = await apiRequest("DELETE", `/users/${throwawayUser.id}`);
    assert("DELETE /users/:id", (delUser as { message: string }).message === "User deleted");

    // Throwaway project
    const { data: throwawayProject } = await apiRequest<{ id: string }>(
      "POST", "/projects", { name: "Temp Project", description: "" }
    );
    const { data: delProject } = await apiRequest("DELETE", `/projects/${throwawayProject.id}`);
    assert("DELETE /projects/:id", (delProject as { message: string }).message === "Project deleted");

    // ── 11. Error cases ─────────────────────────────────────────────────────
    heading("11. Error Cases");

    const { status: s404User } = await apiRequest("GET", "/users/nonexistent-id");
    assert("GET /users/:id with bad id → 404", s404User === 404);

    const { status: s400Name } = await apiRequest("POST", "/users", { email: "no-name@x.com" });
    assert("POST /users without name → 400", s400Name === 400);

    const { status: sMissingUserId } = await apiRequest("GET", "/notifications");
    assert("GET /notifications without userId → 400", sMissingUserId === 400);

    const { status: s404Route } = await apiRequest("GET", "/unknown-route");
    assert("Unknown route → 404", s404Route === 404);

    const { status: s400Comment } = await apiRequest("GET", "/comments");
    assert("GET /comments without taskId → 400", s400Comment === 400);

    const { status: s422back } = await apiRequest("PUT", `/tasks/${task1.id}/status`, { status: "todo" });
    assert("Status backward transition already-done task → 422", s422back === 422);

  } finally {
    // ── Summary ────────────────────────────────────────────────────────────
    const resultColor = failed > 0 ? C.red : C.green;
    console.log(
      `\n${C.bold}Results: ${C.green}${passed} passed${C.reset}${C.bold}, ${resultColor}${failed} failed${C.reset}\n`
    );
    server.close();
    if (failed > 0) process.exit(1);
  }
}

runDemo().catch((err: unknown) => {
  console.error("Demo crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
