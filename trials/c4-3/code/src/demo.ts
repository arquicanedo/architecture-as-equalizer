/**
 * Demo script — starts the server, exercises every API endpoint,
 * and prints a formatted summary of results.
 *
 * Run with:  npx tsx src/demo.ts
 */

import { createServer, request as httpRequest } from "http";
import type { RequestOptions } from "http";

import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

// ---- Bootstrap a fresh server on a demo port --------------------------------

const DEMO_PORT = 3001;
const BASE_URL = `http://localhost:${DEMO_PORT}`;

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

const server = createServer((req, res) => {
  router.handle(req, res).catch((err: unknown) => {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
});

// ---- HTTP helper ------------------------------------------------------------

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;

    const options: RequestOptions = {
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload !== undefined
          ? { "Content-Length": String(Buffer.byteLength(payload)) }
          : {}),
      },
    };

    const req = httpRequest(options, (res) => {
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
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

// ---- Pretty printer ---------------------------------------------------------

let stepNum = 0;

function printStep(title: string): void {
  stepNum++;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Step ${stepNum}: ${title}`);
  console.log("─".repeat(60));
}

function printResult(label: string, data: unknown): void {
  const formatted = JSON.stringify(data, null, 2)
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");
  console.log(`  ${label}:\n${formatted}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌  ASSERTION FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅  ${message}`);
  }
}

// ---- Demo flow --------------------------------------------------------------

async function runDemo(): Promise<void> {
  console.log("\n🚀  Task Management API — End-to-End Demo");
  console.log("=".repeat(60));

  // ===========================================================================
  // USERS
  // ===========================================================================

  printStep("Create users");
  const aliceResp = await apiRequest<{ id: string; name: string; email: string }>(
    "POST", "/users", { name: "Alice", email: "alice@example.com" }
  );
  const bobResp = await apiRequest<{ id: string; name: string; email: string }>(
    "POST", "/users", { name: "Bob", email: "bob@example.com" }
  );
  const carolResp = await apiRequest<{ id: string; name: string; email: string }>(
    "POST", "/users", { name: "Carol", email: "carol@example.com" }
  );
  assert(aliceResp.status === 201, `Alice created (status ${aliceResp.status})`);
  assert(bobResp.status === 201, `Bob created (status ${bobResp.status})`);
  assert(carolResp.status === 201, `Carol created (status ${carolResp.status})`);

  const alice = aliceResp.body;
  const bob = bobResp.body;
  const carol = carolResp.body;
  printResult("Alice", alice);
  printResult("Bob", bob);
  printResult("Carol", carol);

  printStep("Get all users");
  const allUsersResp = await apiRequest<unknown[]>("GET", "/users");
  assert(allUsersResp.status === 200, "GET /users returns 200");
  assert(Array.isArray(allUsersResp.body) && allUsersResp.body.length === 3, "3 users in store");
  printResult("All users count", allUsersResp.body.length);

  printStep("Get user by ID");
  const getUserResp = await apiRequest("GET", `/users/${alice.id}`);
  assert(getUserResp.status === 200, `GET /users/${alice.id} returns 200`);

  printStep("Update a user");
  const updateUserResp = await apiRequest<{ name: string }>(
    "PUT", `/users/${carol.id}`, { name: "Carol Updated" }
  );
  assert(updateUserResp.status === 200, "PUT /users/:id returns 200");
  assert(updateUserResp.body.name === "Carol Updated", "Name was updated");
  printResult("Updated Carol", updateUserResp.body);

  // ===========================================================================
  // PROJECTS
  // ===========================================================================

  printStep("Create a project");
  const projectResp = await apiRequest<{
    id: string; name: string; description: string; memberIds: string[];
  }>(
    "POST", "/projects",
    { name: "Alpha Project", description: "Our flagship initiative" }
  );
  assert(projectResp.status === 201, `Project created (status ${projectResp.status})`);
  const project = projectResp.body;
  printResult("Project", project);

  printStep("Get all projects");
  const allProjectsResp = await apiRequest<unknown[]>("GET", "/projects");
  assert(allProjectsResp.status === 200, "GET /projects returns 200");
  assert(
    Array.isArray(allProjectsResp.body) && allProjectsResp.body.length === 1,
    "1 project in store"
  );

  printStep("Add members to project");
  const addAliceResp = await apiRequest<{ memberIds: string[] }>(
    "POST", `/projects/${project.id}/members`, { userId: alice.id }
  );
  const addBobResp = await apiRequest<{ memberIds: string[] }>(
    "POST", `/projects/${project.id}/members`, { userId: bob.id }
  );
  assert(addAliceResp.status === 200, "Alice added to project");
  assert(addBobResp.status === 200, "Bob added to project");
  assert(addBobResp.body.memberIds.length === 2, "Project has 2 members");
  printResult("Project members", addBobResp.body.memberIds);

  printStep("Remove a member then re-add");
  const removeBobResp = await apiRequest<{ memberIds: string[] }>(
    "DELETE", `/projects/${project.id}/members`, { userId: bob.id }
  );
  assert(removeBobResp.status === 200, "Bob removed from project");
  assert(removeBobResp.body.memberIds.length === 1, "1 member after removal");
  // Re-add Bob
  await apiRequest("POST", `/projects/${project.id}/members`, { userId: bob.id });
  const projectAfterReAddResp = await apiRequest<{ memberIds: string[] }>(
    "GET", `/projects/${project.id}`
  );
  assert(
    projectAfterReAddResp.body.memberIds.length === 2,
    "2 members after re-adding Bob"
  );

  printStep("Update a project");
  const updateProjResp = await apiRequest<{ description: string }>(
    "PUT", `/projects/${project.id}`, { description: "Updated description" }
  );
  assert(updateProjResp.status === 200, "PUT /projects/:id returns 200");
  assert(
    updateProjResp.body.description === "Updated description",
    "Description was updated"
  );

  // ===========================================================================
  // TASKS
  // ===========================================================================

  printStep("Create tasks");
  const task1Resp = await apiRequest<{
    id: string; title: string; status: string; assigneeId: string | null;
  }>(
    "POST", "/tasks",
    { title: "Design API", description: "Draft the OpenAPI spec", projectId: project.id }
  );
  const task2Resp = await apiRequest<{
    id: string; title: string; status: string; assigneeId: string | null;
  }>(
    "POST", "/tasks",
    { title: "Implement backend", description: "Build the Node.js service", projectId: project.id }
  );
  assert(task1Resp.status === 201, `Task 1 created (status ${task1Resp.status})`);
  assert(task2Resp.status === 201, `Task 2 created (status ${task2Resp.status})`);
  const task1 = task1Resp.body;
  const task2 = task2Resp.body;
  assert(task1.status === "todo", "Task 1 initial status is 'todo'");
  printResult("Task 1", task1);
  printResult("Task 2", task2);

  printStep("Get tasks by project");
  const tasksByProjResp = await apiRequest<unknown[]>(
    "GET", `/tasks?projectId=${project.id}`
  );
  assert(tasksByProjResp.status === 200, "GET /tasks?projectId returns 200");
  assert(
    Array.isArray(tasksByProjResp.body) && tasksByProjResp.body.length === 2,
    "2 tasks in project"
  );
  printResult("Task count in project", tasksByProjResp.body.length);

  printStep("Get task by ID");
  const getTaskResp = await apiRequest("GET", `/tasks/${task1.id}`);
  assert(getTaskResp.status === 200, "GET /tasks/:id returns 200");

  printStep("Assign tasks → publishes task.assigned events → notifications created");
  const assignTask1Resp = await apiRequest<{ assigneeId: string }>(
    "PUT", `/tasks/${task1.id}/assign`, { assigneeId: alice.id }
  );
  const assignTask2Resp = await apiRequest<{ assigneeId: string }>(
    "PUT", `/tasks/${task2.id}/assign`, { assigneeId: bob.id }
  );
  assert(assignTask1Resp.status === 200, "Task 1 assigned to Alice");
  assert(assignTask2Resp.status === 200, "Task 2 assigned to Bob");
  assert(assignTask1Resp.body.assigneeId === alice.id, "Task 1 assigneeId = Alice.id");
  assert(assignTask2Resp.body.assigneeId === bob.id, "Task 2 assigneeId = Bob.id");
  printResult("Task 1 assignee", assignTask1Resp.body.assigneeId);
  printResult("Task 2 assignee", assignTask2Resp.body.assigneeId);

  printStep("Change task status (forward transitions only)");
  const inProgressResp = await apiRequest<{ status: string }>(
    "PUT", `/tasks/${task1.id}/status`, { status: "in-progress" }
  );
  assert(inProgressResp.status === 200, "todo → in-progress accepted (200)");
  assert(inProgressResp.body.status === "in-progress", "Status is now in-progress");

  const doneResp = await apiRequest<{ status: string }>(
    "PUT", `/tasks/${task1.id}/status`, { status: "done" }
  );
  assert(doneResp.status === 200, "in-progress → done accepted (200)");
  assert(doneResp.body.status === "done", "Status is now done");
  printResult("Task 1 status after transitions", doneResp.body.status);

  printStep("Attempt backward status transition (done → todo) — must be rejected");
  const backwardResp = await apiRequest<{ error: string }>(
    "PUT", `/tasks/${task1.id}/status`, { status: "todo" }
  );
  assert(backwardResp.status === 400, "Backward transition correctly rejected (400)");
  printResult("Rejection message", backwardResp.body.error);

  printStep("Attempt same-level status transition (in-progress → in-progress) — must be rejected");
  // First bring task2 to in-progress
  await apiRequest("PUT", `/tasks/${task2.id}/status`, { status: "in-progress" });
  const sameStatusResp = await apiRequest<{ error: string }>(
    "PUT", `/tasks/${task2.id}/status`, { status: "in-progress" }
  );
  assert(sameStatusResp.status === 400, "Same-level transition correctly rejected (400)");
  printResult("Rejection message", sameStatusResp.body.error);

  printStep("Update task fields");
  const updateTaskResp = await apiRequest<{ title: string }>(
    "PUT", `/tasks/${task2.id}`, { title: "Implement backend (revised)" }
  );
  assert(updateTaskResp.status === 200, "PUT /tasks/:id returns 200");
  assert(
    updateTaskResp.body.title === "Implement backend (revised)",
    "Task title updated"
  );
  printResult("Updated task title", updateTaskResp.body.title);

  // ===========================================================================
  // COMMENTS
  // ===========================================================================

  printStep("Add comments to task 2 → publishes comment.added events → notifications");
  // task2 is assigned to Bob; Alice comments → Bob gets notified
  const comment1Resp = await apiRequest<{ id: string; body: string; taskId: string }>(
    "POST", "/comments",
    { taskId: task2.id, authorId: alice.id, body: "Looks good to me!" }
  );
  const comment2Resp = await apiRequest<{ id: string; body: string; taskId: string }>(
    "POST", "/comments",
    { taskId: task2.id, authorId: bob.id, body: "Working on it now." }
  );
  assert(comment1Resp.status === 201, `Comment 1 created (status ${comment1Resp.status})`);
  assert(comment2Resp.status === 201, `Comment 2 created (status ${comment2Resp.status})`);
  const comment1 = comment1Resp.body;
  printResult("Comment 1", comment1);
  printResult("Comment 2", comment2Resp.body);

  printStep("Get comments by task");
  const commentsByTaskResp = await apiRequest<unknown[]>(
    "GET", `/comments?taskId=${task2.id}`
  );
  assert(commentsByTaskResp.status === 200, "GET /comments?taskId returns 200");
  assert(
    Array.isArray(commentsByTaskResp.body) && commentsByTaskResp.body.length === 2,
    "2 comments on task 2"
  );
  printResult("Comment count on task 2", commentsByTaskResp.body.length);

  printStep("Get comment by ID");
  const getCommentResp = await apiRequest("GET", `/comments/${comment1.id}`);
  assert(getCommentResp.status === 200, "GET /comments/:id returns 200");

  printStep("Delete a comment");
  const deleteCommentResp = await apiRequest("DELETE", `/comments/${comment1.id}`);
  assert(deleteCommentResp.status === 204, "DELETE /comments/:id returns 204");
  const afterDeleteComments = await apiRequest<unknown[]>(
    "GET", `/comments?taskId=${task2.id}`
  );
  assert(
    Array.isArray(afterDeleteComments.body) && afterDeleteComments.body.length === 1,
    "1 comment remains after deletion"
  );

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  printStep("Check notifications for Alice");
  // Expected: task.assigned (task1) + 2× task.statusChanged (in-progress, done)
  const aliceNotifsResp = await apiRequest<Array<{
    id: string; message: string; read: boolean; createdAt: string;
  }>>(
    "GET", `/notifications?userId=${alice.id}`
  );
  assert(aliceNotifsResp.status === 200, "GET /notifications?userId returns 200 for Alice");
  assert(Array.isArray(aliceNotifsResp.body), "Response is an array");
  console.log(`  ℹ️   Alice has ${aliceNotifsResp.body.length} notification(s):`);
  aliceNotifsResp.body.forEach((n, i) => {
    console.log(`       [${i + 1}] read=${n.read} | ${n.message}`);
  });
  assert(aliceNotifsResp.body.length === 3, "Alice has 3 notifications (assigned + 2 status changes)");

  printStep("Check notifications for Bob");
  // Expected: task.assigned (task2) + task.statusChanged (in-progress)
  //         + comment.added ×2 (Alice commented, Bob commented on his own task)
  const bobNotifsResp = await apiRequest<Array<{
    id: string; message: string; read: boolean;
  }>>(
    "GET", `/notifications?userId=${bob.id}`
  );
  assert(bobNotifsResp.status === 200, "GET /notifications?userId returns 200 for Bob");
  console.log(`  ℹ️   Bob has ${bobNotifsResp.body.length} notification(s):`);
  bobNotifsResp.body.forEach((n, i) => {
    console.log(`       [${i + 1}] read=${n.read} | ${n.message}`);
  });
  assert(bobNotifsResp.body.length >= 3, "Bob has at least 3 notifications");

  printStep("Mark Alice's first notification as read");
  if (aliceNotifsResp.body.length > 0) {
    const notifToRead = aliceNotifsResp.body[0];
    const markReadResp = await apiRequest<{ read: boolean; id: string }>(
      "PUT", `/notifications/${notifToRead.id}/read`
    );
    assert(markReadResp.status === 200, "PUT /notifications/:id/read returns 200");
    assert(markReadResp.body.read === true, "Notification is now marked as read");
    printResult("Marked notification", markReadResp.body);
  }

  // ===========================================================================
  // ERROR CASES
  // ===========================================================================

  printStep("Error — get non-existent user");
  const notFoundResp = await apiRequest<{ error: string }>("GET", "/users/does-not-exist");
  assert(notFoundResp.status === 404, "GET /users/:id 404 for unknown ID");
  printResult("Error body", notFoundResp.body);

  printStep("Error — create user with missing fields");
  const missingFieldResp = await apiRequest<{ error: string }>(
    "POST", "/users", { name: "" }
  );
  assert(missingFieldResp.status === 400, "POST /users 400 for missing fields");
  printResult("Validation error", missingFieldResp.body);

  printStep("Error — GET /tasks without projectId");
  const noQpResp = await apiRequest<{ error: string }>("GET", "/tasks");
  assert(noQpResp.status === 400, "GET /tasks without projectId returns 400");
  printResult("Error body", noQpResp.body);

  printStep("Error — GET /comments without taskId");
  const noTaskQpResp = await apiRequest<{ error: string }>("GET", "/comments");
  assert(noTaskQpResp.status === 400, "GET /comments without taskId returns 400");
  printResult("Error body", noTaskQpResp.body);

  printStep("Error — unknown route");
  const unknownRouteResp = await apiRequest<{ error: string }>("GET", "/unknown-route");
  assert(unknownRouteResp.status === 404, "Unknown route returns 404");
  printResult("Error body", unknownRouteResp.body);

  // ===========================================================================
  // CLEANUP — delete resources
  // ===========================================================================

  printStep("Delete task");
  const deleteTask1Resp = await apiRequest("DELETE", `/tasks/${task1.id}`);
  assert(deleteTask1Resp.status === 204, "DELETE /tasks/:id returns 204");
  // Verify gone
  const task1GoneResp = await apiRequest("GET", `/tasks/${task1.id}`);
  assert(task1GoneResp.status === 404, "Deleted task returns 404");

  printStep("Delete project");
  const deleteProjResp = await apiRequest("DELETE", `/projects/${project.id}`);
  assert(deleteProjResp.status === 204, "DELETE /projects/:id returns 204");

  printStep("Delete user");
  const deleteCarolResp = await apiRequest("DELETE", `/users/${carol.id}`);
  assert(deleteCarolResp.status === 204, "DELETE /users/:id returns 204");
  const usersAfterDelete = await apiRequest<unknown[]>("GET", "/users");
  assert(
    Array.isArray(usersAfterDelete.body) && usersAfterDelete.body.length === 2,
    "2 users remain after deleting Carol"
  );

  // ===========================================================================
  // Summary
  // ===========================================================================

  console.log(`\n${"=".repeat(60)}`);
  console.log("🎉  Demo complete!");
  if (process.exitCode === 1) {
    console.log("⚠️   One or more assertions failed — see ❌ above.");
  } else {
    console.log("✅   All assertions passed.");
  }
  console.log("=".repeat(60));
}

// ---- Start server then run demo --------------------------------------------

server.listen(DEMO_PORT, () => {
  console.log(`\n[Demo] Server started on port ${DEMO_PORT}`);
  runDemo().finally(() => {
    server.close(() => {
      console.log("[Demo] Server closed.");
      process.exit(process.exitCode ?? 0);
    });
  });
});
