/**
 * Demo script — exercises every API route end-to-end.
 *
 * Starts the server on port 3001, runs through the full workflow, then shuts down.
 * Run with: npx tsx src/demo.ts
 *
 * Workflow:
 *   1.  Create users (Alice, Bob, Charlie)
 *   2.  Create a project
 *   3.  Add members to the project
 *   4.  List projects & get project by id
 *   5.  Update project
 *   6.  Create tasks inside the project
 *   7.  Assign a task → triggers task.assigned notification
 *   8.  Change task status (todo → in-progress → done) → triggers task.statusChanged notifications
 *   9.  Attempt invalid status transitions → expect 400
 *   10. Add comments → triggers comment.added notifications
 *   11. List comments for the task
 *   12. Fetch notifications for Alice (assignee)
 *   13. Mark notifications as read
 *   14. Update a user, delete a user
 *   15. Remove a project member
 *   16. Delete a comment, task, project
 *   17. Test 404 / 400 error cases
 */

import * as http from "http";
import { IncomingMessage, ServerResponse } from "http";
import { handleRequest } from "./router.js";

const DEMO_PORT = 3001;

// ---------------------------------------------------------------------------
// Minimal HTTP client (uses only Node built-ins)
// ---------------------------------------------------------------------------

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
      hostname: "127.0.0.1",
      port: DEMO_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload
          ? { "Content-Length": String(Buffer.byteLength(payload)) }
          : {}),
      },
    };

    const req = http.request(options, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let parsed: T;
        try {
          parsed = JSON.parse(raw) as T;
        } catch {
          parsed = raw as unknown as T;
        }
        resolve({ status: res.statusCode ?? 0, body: parsed });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Console helpers
// ---------------------------------------------------------------------------

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const YELLOW = "\x1b[33m";

let passCount = 0;
let failCount = 0;

function section(title: string): void {
  console.log(
    `\n${BOLD}${CYAN}══════════════════════════════════════════${RESET}`
  );
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(
    `${BOLD}${CYAN}══════════════════════════════════════════${RESET}`
  );
}

function step(description: string): void {
  console.log(`\n${BOLD}▶ ${description}${RESET}`);
}

function assert(description: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ${GREEN}✔${RESET} ${description}`);
    passCount++;
  } else {
    console.log(`  ${RED}✘${RESET} ${description}`);
    if (detail !== undefined) {
      console.log(`    ${DIM}Got: ${JSON.stringify(detail)}${RESET}`);
    }
    failCount++;
  }
}

function log(label: string, value: unknown): void {
  const formatted = JSON.stringify(value, null, 2)
    .split("\n")
    .join("\n    ");
  console.log(`  ${DIM}${label}:${RESET}\n    ${formatted}`);
}

// ---------------------------------------------------------------------------
// Demo runner
// ---------------------------------------------------------------------------

async function runDemo(): Promise<void> {
  section("Task Management API — End-to-End Demo");

  // ==========================================================================
  // 1. User Management
  // ==========================================================================
  section("1. User Management");

  step("POST /users — create Alice");
  const aliceRes = await request<{ id: string; name: string; email: string }>(
    "POST",
    "/users",
    { name: "Alice", email: "alice@example.com" }
  );
  log("Response", aliceRes.body);
  assert("Status 201", aliceRes.status === 201);
  assert("Has id", typeof (aliceRes.body as { id?: string }).id === "string");
  const aliceId = aliceRes.body.id;

  step("POST /users — create Bob");
  const bobRes = await request<{ id: string; name: string }>(
    "POST",
    "/users",
    { name: "Bob", email: "bob@example.com" }
  );
  log("Response", bobRes.body);
  assert("Status 201", bobRes.status === 201);
  const bobId = bobRes.body.id;

  step("POST /users — create Charlie");
  const charlieRes = await request<{ id: string; name: string }>(
    "POST",
    "/users",
    { name: "Charlie", email: "charlie@example.com" }
  );
  log("Response", charlieRes.body);
  assert("Status 201", charlieRes.status === 201);
  const charlieId = charlieRes.body.id;

  step("GET /users — list all");
  const usersRes = await request<unknown[]>("GET", "/users");
  log("Response", usersRes.body);
  assert("Status 200", usersRes.status === 200);
  assert(
    "Returns 3 users",
    Array.isArray(usersRes.body) && usersRes.body.length === 3
  );

  step("GET /users/:id — fetch Alice");
  const getUserRes = await request<{ id: string }>("GET", `/users/${aliceId}`);
  assert("Status 200", getUserRes.status === 200);
  assert("Correct user id", (getUserRes.body as { id: string }).id === aliceId);

  step("PUT /users/:id — update Alice's name");
  const updateUserRes = await request<{ name: string }>(
    "PUT",
    `/users/${aliceId}`,
    { name: "Alice Smith" }
  );
  log("Response", updateUserRes.body);
  assert("Status 200", updateUserRes.status === 200);
  assert(
    "Name updated",
    (updateUserRes.body as { name: string }).name === "Alice Smith"
  );

  step("GET /users/:id — 404 for unknown id");
  const notFoundRes = await request("GET", "/users/no-such-user");
  assert("Status 404", notFoundRes.status === 404);

  step("POST /users — 400 when name missing");
  const badUserRes = await request("POST", "/users", { email: "x@x.com" });
  assert("Status 400", badUserRes.status === 400);

  // ==========================================================================
  // 2. Project Management
  // ==========================================================================
  section("2. Project Management");

  step("POST /projects — create Alpha Project");
  const projRes = await request<{
    id: string;
    name: string;
    memberIds: string[];
  }>("POST", "/projects", {
    name: "Alpha Project",
    description: "Our flagship project",
  });
  log("Response", projRes.body);
  assert("Status 201", projRes.status === 201);
  assert("memberIds empty", projRes.body.memberIds.length === 0);
  const projectId = projRes.body.id;

  step("GET /projects — list all");
  const projListRes = await request<unknown[]>("GET", "/projects");
  assert("Status 200", projListRes.status === 200);
  assert(
    "1 project",
    Array.isArray(projListRes.body) && projListRes.body.length === 1
  );

  step("GET /projects/:id — fetch by id");
  const getProjRes = await request<{ id: string }>(
    "GET",
    `/projects/${projectId}`
  );
  assert("Status 200", getProjRes.status === 200);
  assert(
    "Correct project",
    (getProjRes.body as { id: string }).id === projectId
  );

  step("PUT /projects/:id — update description");
  const updateProjRes = await request<{ description: string }>(
    "PUT",
    `/projects/${projectId}`,
    { description: "Updated description" }
  );
  assert("Status 200", updateProjRes.status === 200);
  assert(
    "Description updated",
    (updateProjRes.body as { description: string }).description ===
      "Updated description"
  );

  step("POST /projects/:id/members — add Alice");
  const addAliceRes = await request<{ memberIds: string[] }>(
    "POST",
    `/projects/${projectId}/members`,
    { userId: aliceId }
  );
  log("Response", addAliceRes.body);
  assert("Status 200", addAliceRes.status === 200);
  assert("Alice in memberIds", addAliceRes.body.memberIds.includes(aliceId));

  step("POST /projects/:id/members — add Bob");
  const addBobRes = await request<{ memberIds: string[] }>(
    "POST",
    `/projects/${projectId}/members`,
    { userId: bobId }
  );
  assert("Status 200", addBobRes.status === 200);
  assert("Bob in memberIds", addBobRes.body.memberIds.includes(bobId));

  step("POST /projects/:id/members — idempotent re-add Alice");
  const addAliceAgainRes = await request<{ memberIds: string[] }>(
    "POST",
    `/projects/${projectId}/members`,
    { userId: aliceId }
  );
  assert("Status 200", addAliceAgainRes.status === 200);
  assert(
    "Alice appears only once",
    addAliceAgainRes.body.memberIds.filter((m: string) => m === aliceId)
      .length === 1
  );

  // ==========================================================================
  // 3. Task Management
  // ==========================================================================
  section("3. Task Management");

  step("POST /tasks — create task 1 (Design DB schema)");
  const task1Res = await request<{
    id: string;
    title: string;
    status: string;
    assigneeId: string | null;
  }>("POST", "/tasks", {
    title: "Design database schema",
    description: "ERD and table definitions",
    projectId,
  });
  log("Response", task1Res.body);
  assert("Status 201", task1Res.status === 201);
  assert("Status is todo", task1Res.body.status === "todo");
  assert("assigneeId is null", task1Res.body.assigneeId === null);
  const task1Id = task1Res.body.id;

  step("POST /tasks — create task 2 (Implement API)");
  const task2Res = await request<{ id: string; title: string }>("POST", "/tasks", {
    title: "Implement REST API",
    description: "All CRUD endpoints",
    projectId,
  });
  assert("Status 201", task2Res.status === 201);
  const task2Id = task2Res.body.id;

  step("GET /tasks?projectId=X — list tasks in project");
  const tasksRes = await request<unknown[]>(
    "GET",
    `/tasks?projectId=${projectId}`
  );
  log("Response", tasksRes.body);
  assert("Status 200", tasksRes.status === 200);
  assert(
    "2 tasks found",
    Array.isArray(tasksRes.body) && tasksRes.body.length === 2
  );

  step("GET /tasks — 400 without projectId query param");
  const tasksBadRes = await request("GET", "/tasks");
  assert("Status 400", tasksBadRes.status === 400);

  step("GET /tasks/:id — fetch task 1");
  const getTaskRes = await request<{ id: string }>("GET", `/tasks/${task1Id}`);
  assert("Status 200", getTaskRes.status === 200);
  assert(
    "Correct task",
    (getTaskRes.body as { id: string }).id === task1Id
  );

  step("PUT /tasks/:id/assign — assign task 1 to Alice");
  const assignRes = await request<{
    id: string;
    assigneeId: string;
    title: string;
  }>("PUT", `/tasks/${task1Id}/assign`, { assigneeId: aliceId });
  log("Response", assignRes.body);
  assert("Status 200", assignRes.status === 200);
  assert("assigneeId is Alice", assignRes.body.assigneeId === aliceId);
  // → event: task.assigned → notification created for Alice

  step("PUT /tasks/:id/status — todo → in-progress");
  const status1Res = await request<{ status: string }>(
    "PUT",
    `/tasks/${task1Id}/status`,
    { status: "in-progress" }
  );
  log("Response", status1Res.body);
  assert("Status 200", status1Res.status === 200);
  assert(
    "Status is in-progress",
    (status1Res.body as { status: string }).status === "in-progress"
  );
  // → event: task.statusChanged → notification for Alice

  step("PUT /tasks/:id/status — in-progress → done");
  const status2Res = await request<{ status: string }>(
    "PUT",
    `/tasks/${task1Id}/status`,
    { status: "done" }
  );
  assert("Status 200", status2Res.status === 200);
  assert(
    "Status is done",
    (status2Res.body as { status: string }).status === "done"
  );
  // → event: task.statusChanged → notification for Alice

  step("PUT /tasks/:id/status — INVALID backward: done → todo");
  const badStatusRes = await request("PUT", `/tasks/${task1Id}/status`, {
    status: "todo",
  });
  log("Error body", badStatusRes.body);
  assert("Status 400", badStatusRes.status === 400);

  step("PUT /tasks/:id/status — INVALID skip: todo → done");
  const skipStatusRes = await request("PUT", `/tasks/${task2Id}/status`, {
    status: "done",
  });
  log("Error body", skipStatusRes.body);
  assert("Status 400", skipStatusRes.status === 400);

  step("PUT /tasks/:id — update task 1 title");
  const updateTaskRes = await request<{ title: string }>(
    "PUT",
    `/tasks/${task1Id}`,
    { title: "Design database schema (revised)" }
  );
  assert("Status 200", updateTaskRes.status === 200);
  assert(
    "Title updated",
    (updateTaskRes.body as { title: string }).title ===
      "Design database schema (revised)"
  );

  // ==========================================================================
  // 4. Comments
  // ==========================================================================
  section("4. Comment Management");

  step("POST /comments — Bob comments on task 2 (unassigned)");
  const comment1Res = await request<{ id: string; body: string }>(
    "POST",
    "/comments",
    {
      taskId: task2Id,
      authorId: bobId,
      body: "I will start on this tomorrow.",
    }
  );
  log("Response", comment1Res.body);
  assert("Status 201", comment1Res.status === 201);
  const comment1Id = comment1Res.body.id;
  // task2 has no assignee → no notification

  step("PUT /tasks/:id/assign — assign task 2 to Alice");
  const assignTask2Res = await request<{ assigneeId: string }>(
    "PUT",
    `/tasks/${task2Id}/assign`,
    { assigneeId: aliceId }
  );
  assert("Status 200", assignTask2Res.status === 200);
  assert("assigneeId is Alice", assignTask2Res.body.assigneeId === aliceId);
  // → task.assigned notification for Alice

  step("POST /comments — Charlie comments on task 2 (Alice is assignee → Alice notified)");
  const comment2Res = await request<{ id: string }>("POST", "/comments", {
    taskId: task2Id,
    authorId: charlieId,
    body: "Can we discuss the API design first?",
  });
  log("Response", comment2Res.body);
  assert("Status 201", comment2Res.status === 201);
  const comment2Id = comment2Res.body.id;
  // → comment.added → notification for Alice

  step("POST /comments — Alice comments on her own task (no self-notification)");
  const comment3Res = await request<{ id: string }>("POST", "/comments", {
    taskId: task2Id,
    authorId: aliceId,
    body: "Good idea, preparing a design doc now.",
  });
  assert("Status 201", comment3Res.status === 201);
  // → comment.added → authorId === taskAssigneeId → no notification

  step("GET /comments?taskId=X — list comments for task 2");
  const commentsRes = await request<unknown[]>(
    "GET",
    `/comments?taskId=${task2Id}`
  );
  log("Response", commentsRes.body);
  assert("Status 200", commentsRes.status === 200);
  assert(
    "3 comments",
    Array.isArray(commentsRes.body) && commentsRes.body.length === 3
  );

  step("GET /comments/:id — fetch comment 1");
  const getCommentRes = await request<{ id: string }>(
    "GET",
    `/comments/${comment1Id}`
  );
  assert("Status 200", getCommentRes.status === 200);
  assert(
    "Correct comment",
    (getCommentRes.body as { id: string }).id === comment1Id
  );

  step("GET /comments — 400 without taskId param");
  const commentsBadRes = await request("GET", "/comments");
  assert("Status 400", commentsBadRes.status === 400);

  step("POST /comments — 404 for unknown taskId");
  const badCommentRes = await request("POST", "/comments", {
    taskId: "nonexistent-task",
    authorId: aliceId,
    body: "This should fail.",
  });
  log("Error body", badCommentRes.body);
  assert("Status 404", badCommentRes.status === 404);

  step("POST /comments — 400 when body is empty");
  const emptyBodyComment = await request("POST", "/comments", {
    taskId: task2Id,
    authorId: aliceId,
    body: "",
  });
  assert("Status 400", emptyBodyComment.status === 400);

  // ==========================================================================
  // 5. Notifications
  // ==========================================================================
  section("5. Notification Service");

  step("GET /notifications?userId=Alice — list all notifications");
  const notifsRes = await request<
    Array<{ id: string; message: string; read: boolean; userId: string }>
  >("GET", `/notifications?userId=${aliceId}`);
  log("Alice's notifications", notifsRes.body);
  assert("Status 200", notifsRes.status === 200);
  assert(
    "Alice has notifications",
    Array.isArray(notifsRes.body) && notifsRes.body.length > 0
  );

  // Expected notifications for Alice:
  //   1. task.assigned    → task 1 assigned to Alice
  //   2. task.statusChanged → task 1 todo → in-progress
  //   3. task.statusChanged → task 1 in-progress → done
  //   4. task.assigned    → task 2 assigned to Alice
  //   5. comment.added    → Charlie commented on task 2
  assert(
    "Alice has at least 5 notifications",
    Array.isArray(notifsRes.body) && notifsRes.body.length >= 5
  );

  const allUnread = notifsRes.body.every((n) => !n.read);
  assert("All notifications start unread", allUnread, notifsRes.body);

  const firstNotifId = notifsRes.body[0]?.id;

  step(`PUT /notifications/${firstNotifId}/read — mark as read`);
  const markReadRes = await request<{ id: string; read: boolean }>(
    "PUT",
    `/notifications/${firstNotifId}/read`
  );
  log("Response", markReadRes.body);
  assert("Status 200", markReadRes.status === 200);
  assert("read is true", (markReadRes.body as { read: boolean }).read === true);

  step("GET /notifications — verify first notification is now read");
  const notifsRes2 = await request<Array<{ id: string; read: boolean }>>(
    "GET",
    `/notifications?userId=${aliceId}`
  );
  const updatedNotif = notifsRes2.body.find((n) => n.id === firstNotifId);
  assert("Notification.read is true", updatedNotif?.read === true);

  step("GET /notifications?userId=Bob — Bob has no notifications");
  const bobNotifsRes = await request<unknown[]>(
    "GET",
    `/notifications?userId=${bobId}`
  );
  log("Bob's notifications", bobNotifsRes.body);
  assert("Status 200", bobNotifsRes.status === 200);
  assert(
    "Bob has 0 notifications (commented before task was assigned)",
    Array.isArray(bobNotifsRes.body) && bobNotifsRes.body.length === 0
  );

  step("GET /notifications — 400 without userId param");
  const notifsNoUserRes = await request("GET", "/notifications");
  assert("Status 400", notifsNoUserRes.status === 400);

  step("PUT /notifications/:id/read — 404 for unknown notification");
  const badNotifRes = await request("PUT", "/notifications/no-such-id/read");
  assert("Status 404", badNotifRes.status === 404);

  // ==========================================================================
  // 6. Delete Operations
  // ==========================================================================
  section("6. Delete Operations");

  step("DELETE /comments/:id — delete comment 2");
  const delCommentRes = await request("DELETE", `/comments/${comment2Id}`);
  assert("Status 204", delCommentRes.status === 204);

  step("GET /comments/:id — 404 after delete");
  const delCommentGetRes = await request("GET", `/comments/${comment2Id}`);
  assert("Status 404", delCommentGetRes.status === 404);

  step("DELETE /tasks/:id — delete task 2");
  const delTaskRes = await request("DELETE", `/tasks/${task2Id}`);
  assert("Status 204", delTaskRes.status === 204);

  step("GET /tasks/:id — 404 after delete");
  const delTaskGetRes = await request("GET", `/tasks/${task2Id}`);
  assert("Status 404", delTaskGetRes.status === 404);

  step("DELETE /projects/:id/members — remove Bob");
  const removeMemberRes = await request<{ memberIds: string[] }>(
    "DELETE",
    `/projects/${projectId}/members`,
    { userId: bobId }
  );
  assert("Status 200", removeMemberRes.status === 200);
  assert(
    "Bob removed from memberIds",
    !removeMemberRes.body.memberIds.includes(bobId)
  );

  step("DELETE /users/:id — delete Charlie");
  const delUserRes = await request("DELETE", `/users/${charlieId}`);
  assert("Status 204", delUserRes.status === 204);

  step("GET /users/:id — 404 after deleting Charlie");
  const delUserGetRes = await request("GET", `/users/${charlieId}`);
  assert("Status 404", delUserGetRes.status === 404);

  step("DELETE /projects/:id — delete the project");
  const delProjRes = await request("DELETE", `/projects/${projectId}`);
  assert("Status 204", delProjRes.status === 204);

  step("GET /projects/:id — 404 after delete");
  const delProjGetRes = await request("GET", `/projects/${projectId}`);
  assert("Status 404", delProjGetRes.status === 404);

  // ==========================================================================
  // 7. Miscellaneous / Edge Cases
  // ==========================================================================
  section("7. Edge Cases & Unknown Routes");

  step("GET /unknown-resource → 404");
  const unknownRes = await request("GET", "/unknown-resource");
  assert("Status 404", unknownRes.status === 404);

  step("POST /users with no body → 400");
  const noBodyRes = await request("POST", "/users");
  assert("Status 400", noBodyRes.status === 400);

  step("DELETE /users/:id — 404 for already-deleted user");
  const del2UserRes = await request("DELETE", `/users/${charlieId}`);
  assert("Status 404", del2UserRes.status === 404);

  // ==========================================================================
  // Summary
  // ==========================================================================
  const total = passCount + failCount;
  const colour = failCount === 0 ? GREEN : RED;
  section("Demo Summary");
  console.log(
    `\n  ${colour}${BOLD}${passCount} / ${total} assertions passed${RESET}` +
      (failCount > 0 ? `   ${RED}(${failCount} failed)${RESET}` : "  🎉")
  );
  console.log();
}

// ---------------------------------------------------------------------------
// Bootstrap — spin up a local server then run the demo
// ---------------------------------------------------------------------------

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  handleRequest(req, res).catch((err: unknown) => {
    console.error("[Demo server] unexpected error:", err);
    if (!res.headersSent) res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.listen(DEMO_PORT, "127.0.0.1", () => {
  console.log(
    `${YELLOW}${BOLD}[Demo] Server listening on http://127.0.0.1:${DEMO_PORT}${RESET}`
  );
  runDemo()
    .catch((err: unknown) => {
      console.error(`${RED}[Demo] Fatal error:${RESET}`, err);
    })
    .finally(() => {
      server.close(() => {
        console.log(`${DIM}[Demo] Server shut down.${RESET}\n`);
        process.exit(failCount > 0 ? 1 : 0);
      });
    });
});
