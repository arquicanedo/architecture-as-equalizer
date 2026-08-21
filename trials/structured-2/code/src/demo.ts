/**
 * Demo Script
 * Starts the server, exercises every feature end-to-end, then shuts down.
 *
 * Run with:  npx tsx src/demo.ts
 *
 * Flow:
 *  1. Create users
 *  2. Create project + add members
 *  3. Create tasks
 *  4. Assign tasks  → triggers task.assigned notification
 *  5. Change task status (todo → in-progress → done)  → notifications
 *  6. Add comments  → comment.added notifications
 *  7. Read notifications for each user
 *  8. Mark notifications as read
 *  9. Edge-case: invalid status transition (expect 400)
 * 10. Clean-up: delete a comment, task, project, user
 */

import { createServer } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { createRouter } from "./router";

// ---------------------------------------------------------------------------
// Spin up an ephemeral server on a random port
// ---------------------------------------------------------------------------
const eventBus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus);

const handler = createRouter(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

const server = createServer(handler);

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
function request(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      return reject(new Error("Server not ready"));
    }
    const port = addr.port;
    const payload = body ? JSON.stringify(body) : undefined;

    const options = {
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const { request: httpRequest } = require("http") as typeof import("http");
    const req = httpRequest(options, (res) => {
      let raw = "";
      res.on("data", (chunk: Buffer) => (raw += chunk.toString()));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}${"─".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${"─".repeat(60)}${RESET}`);
}

function log(label: string, status: number, data: unknown): void {
  const colour = status < 300 ? GREEN : status < 500 ? YELLOW : RED;
  console.log(
    `${colour}[${status}]${RESET} ${BOLD}${label}${RESET}\n` +
      JSON.stringify(data, null, 2)
  );
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`${RED}${BOLD}ASSERTION FAILED: ${message}${RESET}`);
    process.exit(1);
  }
  console.log(`${GREEN}  ✓ ${message}${RESET}`);
}

// ---------------------------------------------------------------------------
// Main demo
// ---------------------------------------------------------------------------
async function runDemo(): Promise<void> {
  // ── 1. Users ────────────────────────────────────────────────────────────
  section("1. Create Users");

  const { status: s1, data: alice } = await request("POST", "/users", {
    name: "Alice",
    email: "alice@example.com",
  });
  log("POST /users (Alice)", s1, alice);
  assert(s1 === 201, "Alice created (201)");
  assert(alice.id !== undefined, "Alice has an id");

  const { status: s2, data: bob } = await request("POST", "/users", {
    name: "Bob",
    email: "bob@example.com",
  });
  log("POST /users (Bob)", s2, bob);
  assert(s2 === 201, "Bob created (201)");

  const { status: s3, data: users } = await request("GET", "/users");
  log("GET /users", s3, users);
  assert(users.length === 2, "Two users exist");

  // Update a user
  const { status: s4, data: updatedAlice } = await request(
    "PUT",
    `/users/${alice.id}`,
    { name: "Alice A." }
  );
  log("PUT /users/:id (rename Alice)", s4, updatedAlice);
  assert(updatedAlice.name === "Alice A.", "Alice's name updated");

  // ── 2. Project ──────────────────────────────────────────────────────────
  section("2. Create Project & Add Members");

  const { status: s5, data: project } = await request("POST", "/projects", {
    name: "Alpha",
    description: "First project",
  });
  log("POST /projects", s5, project);
  assert(s5 === 201, "Project created (201)");

  const { status: s6, data: projWithAlice } = await request(
    "POST",
    `/projects/${project.id}/members`,
    { userId: alice.id }
  );
  log("POST /projects/:id/members (add Alice)", s6, projWithAlice);
  assert(projWithAlice.memberIds.includes(alice.id), "Alice is a member");

  const { status: s7, data: projWithBob } = await request(
    "POST",
    `/projects/${project.id}/members`,
    { userId: bob.id }
  );
  log("POST /projects/:id/members (add Bob)", s7, projWithBob);
  assert(projWithBob.memberIds.includes(bob.id), "Bob is a member");

  // Remove Bob then re-add (exercise removeMember)
  const { status: s8, data: projNoBob } = await request(
    "DELETE",
    `/projects/${project.id}/members`,
    { userId: bob.id }
  );
  log("DELETE /projects/:id/members (remove Bob)", s8, projNoBob);
  assert(!projNoBob.memberIds.includes(bob.id), "Bob removed from members");

  await request("POST", `/projects/${project.id}/members`, { userId: bob.id });

  // ── 3. Tasks ────────────────────────────────────────────────────────────
  section("3. Create Tasks");

  const { status: s9, data: task1 } = await request("POST", "/tasks", {
    title: "Design API schema",
    description: "Draft the OpenAPI spec",
    projectId: project.id,
  });
  log("POST /tasks (task1)", s9, task1);
  assert(s9 === 201, "Task 1 created (201)");
  assert(task1.status === "todo", "Task starts with status 'todo'");

  const { status: s10, data: task2 } = await request("POST", "/tasks", {
    title: "Implement endpoints",
    description: "Write the route handlers",
    projectId: project.id,
  });
  log("POST /tasks (task2)", s10, task2);
  assert(s10 === 201, "Task 2 created (201)");

  // Get tasks by project
  const { status: s11, data: projectTasks } = await request(
    "GET",
    `/tasks?projectId=${project.id}`
  );
  log(`GET /tasks?projectId=${project.id}`, s11, projectTasks);
  assert(projectTasks.length === 2, "Two tasks belong to the project");

  // ── 4. Assign Tasks ─────────────────────────────────────────────────────
  section("4. Assign Tasks → task.assigned notifications");

  const { status: s12, data: assignedTask1 } = await request(
    "PUT",
    `/tasks/${task1.id}/assign`,
    { assigneeId: alice.id }
  );
  log("PUT /tasks/:id/assign (task1 → Alice)", s12, assignedTask1);
  assert(assignedTask1.assigneeId === alice.id, "Task 1 assigned to Alice");

  const { status: s13, data: assignedTask2 } = await request(
    "PUT",
    `/tasks/${task2.id}/assign`,
    { assigneeId: bob.id }
  );
  log("PUT /tasks/:id/assign (task2 → Bob)", s13, assignedTask2);
  assert(assignedTask2.assigneeId === bob.id, "Task 2 assigned to Bob");

  // ── 5. Status Transitions ───────────────────────────────────────────────
  section("5. Change Task Status → task.statusChanged notifications");

  const { status: s14, data: inProgress } = await request(
    "PUT",
    `/tasks/${task1.id}/status`,
    { status: "in-progress" }
  );
  log("PUT /tasks/:id/status (todo → in-progress)", s14, inProgress);
  assert(inProgress.status === "in-progress", "Task 1 is now in-progress");

  const { status: s15, data: done } = await request(
    "PUT",
    `/tasks/${task1.id}/status`,
    { status: "done" }
  );
  log("PUT /tasks/:id/status (in-progress → done)", s15, done);
  assert(done.status === "done", "Task 1 is now done");

  // Invalid backward transition
  section("5b. Invalid Status Transition (expect 400)");
  const { status: s16, data: badTransition } = await request(
    "PUT",
    `/tasks/${task1.id}/status`,
    { status: "todo" }
  );
  log("PUT /tasks/:id/status (done → todo — should fail)", s16, badTransition);
  assert(s16 === 400, "Backward transition rejected with 400");

  // ── 6. Comments ─────────────────────────────────────────────────────────
  section("6. Add Comments → comment.added notifications");

  const { status: s17, data: comment1 } = await request("POST", "/comments", {
    taskId: task1.id,
    authorId: bob.id,
    body: "Great work on this task, Alice!",
  });
  log("POST /comments (Bob on task1)", s17, comment1);
  assert(s17 === 201, "Comment 1 created (201)");
  assert(comment1.body === "Great work on this task, Alice!", "Comment body matches");

  const { status: s18, data: comment2 } = await request("POST", "/comments", {
    taskId: task2.id,
    authorId: alice.id,
    body: "Please update the request validation.",
  });
  log("POST /comments (Alice on task2)", s18, comment2);
  assert(s18 === 201, "Comment 2 created (201)");

  // Get comments by task
  const { status: s19, data: taskComments } = await request(
    "GET",
    `/comments?taskId=${task1.id}`
  );
  log(`GET /comments?taskId=${task1.id}`, s19, taskComments);
  assert(taskComments.length === 1, "One comment on task 1");

  // ── 7. Notifications ────────────────────────────────────────────────────
  section("7. Check Notifications");

  const { status: s20, data: aliceNotifs } = await request(
    "GET",
    `/notifications?userId=${alice.id}`
  );
  log(`GET /notifications?userId=${alice.id} (Alice)`, s20, aliceNotifs);
  // Alice should have: task.assigned (task1), task.statusChanged x2 (task1)
  assert(
    aliceNotifs.length >= 2,
    `Alice has at least 2 notifications (got ${aliceNotifs.length})`
  );
  assert(
    aliceNotifs.every((n: any) => n.userId === alice.id),
    "All notifications belong to Alice"
  );
  assert(
    aliceNotifs.every((n: any) => n.read === false),
    "All notifications start unread"
  );

  const { status: s21, data: bobNotifs } = await request(
    "GET",
    `/notifications?userId=${bob.id}`
  );
  log(`GET /notifications?userId=${bob.id} (Bob)`, s21, bobNotifs);
  // Bob should have: task.assigned (task2), comment.added on task1 (Bob is NOT assignee of task1, Alice is)
  // Actually Bob was assigned task2; Alice commented on task2 → Bob gets notified
  assert(
    bobNotifs.length >= 1,
    `Bob has at least 1 notification (got ${bobNotifs.length})`
  );

  // ── 8. Mark Notification as Read ────────────────────────────────────────
  section("8. Mark Notification as Read");

  const firstAliceNotif = aliceNotifs[0];
  const { status: s22, data: readNotif } = await request(
    "PUT",
    `/notifications/${firstAliceNotif.id}/read`
  );
  log(`PUT /notifications/:id/read`, s22, readNotif);
  assert(readNotif.read === true, "Notification marked as read");

  // ── 9. Get single resources ─────────────────────────────────────────────
  section("9. Single Resource Lookups");

  const { status: s23, data: fetchedTask } = await request(
    "GET",
    `/tasks/${task1.id}`
  );
  log(`GET /tasks/:id`, s23, fetchedTask);
  assert(fetchedTask.id === task1.id, "Fetched correct task by id");

  const { status: s24, data: fetchedComment } = await request(
    "GET",
    `/comments/${comment1.id}`
  );
  log(`GET /comments/:id`, s24, fetchedComment);
  assert(fetchedComment.id === comment1.id, "Fetched correct comment by id");

  const { status: s25, data: fetchedProject } = await request(
    "GET",
    `/projects/${project.id}`
  );
  log(`GET /projects/:id`, s25, fetchedProject);
  assert(fetchedProject.id === project.id, "Fetched correct project by id");

  // ── 10. Update resources ─────────────────────────────────────────────────
  section("10. Update Resources");

  const { status: s26, data: updatedTask } = await request(
    "PUT",
    `/tasks/${task2.id}`,
    { title: "Implement endpoints (revised)" }
  );
  log(`PUT /tasks/:id`, s26, updatedTask);
  assert(updatedTask.title === "Implement endpoints (revised)", "Task title updated");

  const { status: s27, data: updatedProject } = await request(
    "PUT",
    `/projects/${project.id}`,
    { description: "Alpha project — updated description" }
  );
  log(`PUT /projects/:id`, s27, updatedProject);
  assert(
    updatedProject.description === "Alpha project — updated description",
    "Project description updated"
  );

  // ── 11. 404 lookups ─────────────────────────────────────────────────────
  section("11. Not-Found Errors (expect 404)");

  const { status: s28, data: missingUser } = await request(
    "GET",
    "/users/nonexistent-id"
  );
  log("GET /users/nonexistent-id", s28, missingUser);
  assert(s28 === 404, "Missing user returns 404");

  const { status: s29, data: missingTask } = await request(
    "GET",
    "/tasks/nonexistent-id"
  );
  log("GET /tasks/nonexistent-id", s29, missingTask);
  assert(s29 === 404, "Missing task returns 404");

  // ── 12. Delete resources ─────────────────────────────────────────────────
  section("12. Delete Resources");

  const { status: s30, data: deletedComment } = await request(
    "DELETE",
    `/comments/${comment1.id}`
  );
  log(`DELETE /comments/:id`, s30, deletedComment);
  assert(deletedComment.deleted === true, "Comment deleted");

  const { status: s31, data: deletedTask } = await request(
    "DELETE",
    `/tasks/${task2.id}`
  );
  log(`DELETE /tasks/:id`, s31, deletedTask);
  assert(deletedTask.deleted === true, "Task deleted");

  const { status: s32, data: deletedProject } = await request(
    "DELETE",
    `/projects/${project.id}`
  );
  log(`DELETE /projects/:id`, s32, deletedProject);
  assert(deletedProject.deleted === true, "Project deleted");

  const { status: s33, data: deletedUser } = await request(
    "DELETE",
    `/users/${bob.id}`
  );
  log(`DELETE /users/:id`, s33, deletedUser);
  assert(deletedUser.deleted === true, "User deleted");

  // ── Done ─────────────────────────────────────────────────────────────────
  section("✅ All checks passed!");
  console.log(`${GREEN}${BOLD}Demo completed successfully.${RESET}\n`);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
server.listen(0, "127.0.0.1", async () => {
  const addr = server.address() as { port: number };
  console.log(
    `${BOLD}Task Management API demo server started on port ${addr.port}${RESET}`
  );
  try {
    await runDemo();
  } catch (err) {
    console.error(`${RED}${BOLD}Demo error:${RESET}`, err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log("Demo server closed.");
    });
  }
});
