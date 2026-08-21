/**
 * demo.ts
 *
 * Starts the Task Management API server and exercises every feature through
 * HTTP requests using only Node.js built-ins.
 *
 * Run with:  npx tsx src/demo.ts
 */

import * as http from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./user-service";
import { ProjectService } from "./project-service";
import { TaskService } from "./task-service";
import { CommentService } from "./comment-service";
import { NotificationService } from "./notification-service";
import { Router } from "./router";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const DEMO_PORT = 3001;

const eventBus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService(eventBus);
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

const server = http.createServer((req, res) => {
  router.handle(req, res).catch((err: unknown) => {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface HttpResponse {
  status: number;
  body: unknown;
}

function request(
  method: string,
  path: string,
  body?: unknown
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: "localhost",
      port: DEMO_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload
          ? { "Content-Length": Buffer.byteLength(payload) }
          : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
          resolve({ status: res.statusCode ?? 0, body: parsed });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Demo helpers ──────────────────────────────────────────────────────────────

function section(title: string): void {
  console.log("\n" + "═".repeat(62));
  console.log(`  ${title}`);
  console.log("═".repeat(62));
}

function log(label: string, data: unknown): void {
  console.log(`\n▶ ${label}`);
  console.log(JSON.stringify(data, null, 2));
}

// ── Demo ──────────────────────────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  // ── 1. Users ───────────────────────────────────────────────────────────────
  section("1 · Create Users");

  const { body: alice } = await request("POST", "/users", {
    name: "Alice",
    email: "alice@example.com",
  });
  log("Created Alice", alice);

  const { body: bob } = await request("POST", "/users", {
    name: "Bob",
    email: "bob@example.com",
  });
  log("Created Bob", bob);

  const { body: carol } = await request("POST", "/users", {
    name: "Carol",
    email: "carol@example.com",
  });
  log("Created Carol", carol);

  const { body: allUsers } = await request("GET", "/users");
  log("All users", allUsers);

  const { body: updatedAlice } = await request(
    "PUT",
    `/users/${(alice as { id: string }).id}`,
    { name: "Alice Smith" }
  );
  log("Updated Alice's name", updatedAlice);

  // ── 2. Projects ────────────────────────────────────────────────────────────
  section("2 · Create Projects");

  const { body: project } = await request("POST", "/projects", {
    name: "Website Redesign",
    description: "Full redesign of the company website",
  });
  log("Created project", project);

  const { body: mobileProject } = await request("POST", "/projects", {
    name: "Mobile App",
    description: "iOS and Android application",
  });
  log("Created Mobile App project", mobileProject);

  // ── 3. Members ─────────────────────────────────────────────────────────────
  section("3 · Project Members");

  const aliceId = (alice as { id: string }).id;
  const bobId = (bob as { id: string }).id;
  const carolId = (carol as { id: string }).id;
  const projectId = (project as { id: string }).id;

  const { body: projWithAlice } = await request(
    "POST",
    `/projects/${projectId}/members`,
    { userId: aliceId }
  );
  log("Added Alice to project (→ member.added notification)", projWithAlice);

  const { body: projWithBob } = await request(
    "POST",
    `/projects/${projectId}/members`,
    { userId: bobId }
  );
  log("Added Bob to project (→ member.added notification)", projWithBob);

  // Try adding Alice again — should fail
  const { status: dupMemberStatus, body: dupMemberErr } = await request(
    "POST",
    `/projects/${projectId}/members`,
    { userId: aliceId }
  );
  log(
    `Add Alice again (expected 500, got ${dupMemberStatus})`,
    dupMemberErr
  );

  // Remove Carol (not a member — should error)
  const { status: removeBadStatus, body: removeErr } = await request(
    "DELETE",
    `/projects/${projectId}/members`,
    { userId: carolId }
  );
  log(
    `Remove non-member Carol (expected 500, got ${removeBadStatus})`,
    removeErr
  );

  // Add Carol then remove her
  await request("POST", `/projects/${projectId}/members`, { userId: carolId });
  const { body: projAfterRemove } = await request(
    "DELETE",
    `/projects/${projectId}/members`,
    { userId: carolId }
  );
  log("Added then removed Carol from project", projAfterRemove);

  // ── 4. Tasks ───────────────────────────────────────────────────────────────
  section("4 · Create Tasks");

  const { body: task1 } = await request("POST", "/tasks", {
    title: "Design mockups",
    description: "Create Figma mockups for all pages",
    projectId,
    assigneeId: aliceId,
  });
  log("Task 1 created (assigned to Alice → task.assigned notification)", task1);

  const { body: task2 } = await request("POST", "/tasks", {
    title: "Implement header",
    description: "HTML/CSS for the global header",
    projectId,
  });
  log("Task 2 created (unassigned)", task2);

  const { body: task3 } = await request("POST", "/tasks", {
    title: "Write tests",
    description: "Unit and integration tests",
    projectId,
    assigneeId: bobId,
  });
  log("Task 3 created (assigned to Bob → task.assigned notification)", task3);

  const task1Id = (task1 as { id: string }).id;
  const task2Id = (task2 as { id: string }).id;
  const task3Id = (task3 as { id: string }).id;

  const { body: projectTasks } = await request(
    "GET",
    `/tasks?projectId=${projectId}`
  );
  log("All tasks for the project", projectTasks);

  // ── 5. Assignment ──────────────────────────────────────────────────────────
  section("5 · Assign Tasks");

  const { body: assignedTask2 } = await request(
    "PUT",
    `/tasks/${task2Id}/assign`,
    { assigneeId: bobId }
  );
  log("Assigned task2 to Bob (→ task.assigned notification)", assignedTask2);

  const { body: reassignedTask1 } = await request(
    "PUT",
    `/tasks/${task1Id}/assign`,
    { assigneeId: carolId }
  );
  log(
    "Reassigned task1 to Carol (→ task.assigned notification)",
    reassignedTask1
  );

  // Try assigning to non-existent user
  const { status: badAssignStatus, body: badAssignErr } = await request(
    "PUT",
    `/tasks/${task2Id}/assign`,
    { assigneeId: "ghost-id" }
  );
  log(
    `Assign to non-existent user (expected 404, got ${badAssignStatus})`,
    badAssignErr
  );

  // ── 6. Status Transitions ──────────────────────────────────────────────────
  section("6 · Task Status Transitions");

  const { body: t1InProgress } = await request(
    "PUT",
    `/tasks/${task1Id}/status`,
    { status: "in-progress" }
  );
  log(
    "task1: todo → in-progress (→ task.statusChanged notification)",
    t1InProgress
  );

  const { body: t1Done } = await request("PUT", `/tasks/${task1Id}/status`, {
    status: "done",
  });
  log("task1: in-progress → done (→ task.statusChanged notification)", t1Done);

  // Invalid: done → todo
  const { status: badTransStatus, body: badTransErr } = await request(
    "PUT",
    `/tasks/${task1Id}/status`,
    { status: "todo" }
  );
  log(
    `Invalid transition done→todo (expected 500, got ${badTransStatus})`,
    badTransErr
  );

  // Invalid: unknown status
  const { status: unknownStatus, body: unknownErr } = await request(
    "PUT",
    `/tasks/${task2Id}/status`,
    { status: "cancelled" }
  );
  log(
    `Unknown status value (expected 400, got ${unknownStatus})`,
    unknownErr
  );

  const { body: t2InProgress } = await request(
    "PUT",
    `/tasks/${task2Id}/status`,
    { status: "in-progress" }
  );
  log("task2: todo → in-progress", t2InProgress);

  // ── 7. Comments ────────────────────────────────────────────────────────────
  section("7 · Comments");

  // Alice comments on task2 (Bob is assignee → Bob gets notified)
  const { body: comment1 } = await request("POST", "/comments", {
    taskId: task2Id,
    authorId: aliceId,
    body: "I have started on this. Should be done by Friday.",
  });
  log(
    "Alice commented on task2 (Bob is assignee → notification to Bob)",
    comment1
  );

  // Bob comments on his own task (no self-notification)
  const { body: comment2 } = await request("POST", "/comments", {
    taskId: task2Id,
    authorId: bobId,
    body: "Thanks Alice! Let me know if you need any help.",
  });
  log("Bob commented on his own task (no self-notification)", comment2);

  // Alice comments on task3 (Bob is assignee → Bob gets notified)
  const { body: comment3 } = await request("POST", "/comments", {
    taskId: task3Id,
    authorId: aliceId,
    body: "Please make sure to cover edge cases.",
  });
  log(
    "Alice commented on task3 (Bob is assignee → notification to Bob)",
    comment3
  );

  // Fetch comments for task2
  const { body: task2Comments } = await request(
    "GET",
    `/comments?taskId=${task2Id}`
  );
  log("Comments on task2", task2Comments);

  // Delete a comment
  const comment3Id = (comment3 as { id: string }).id;
  const { body: deleteCommentResult } = await request(
    "DELETE",
    `/comments/${comment3Id}`
  );
  log("Deleted comment3", deleteCommentResult);

  // Verify deletion
  const { status: missingCommentStatus, body: missingComment } = await request(
    "GET",
    `/comments/${comment3Id}`
  );
  log(
    `Fetch deleted comment (expected 500, got ${missingCommentStatus})`,
    missingComment
  );

  // ── 8. Notifications ───────────────────────────────────────────────────────
  section("8 · Notifications");

  const { body: aliceNotifs } = await request(
    "GET",
    `/notifications?userId=${aliceId}`
  );
  log("Alice's notifications", aliceNotifs);

  const { body: bobNotifs } = await request(
    "GET",
    `/notifications?userId=${bobId}`
  );
  log("Bob's notifications", bobNotifs);

  const { body: carolNotifs } = await request(
    "GET",
    `/notifications?userId=${carolId}`
  );
  log("Carol's notifications", carolNotifs);

  // Mark Bob's most recent notification as read
  const bobNotifsArr = bobNotifs as Array<{ id: string }>;
  if (bobNotifsArr.length > 0) {
    const { body: readNotif } = await request(
      "PUT",
      `/notifications/${bobNotifsArr[0].id}/read`
    );
    log("Marked Bob's most recent notification as read", readNotif);
  }

  // All notifications (no filter)
  const { body: allNotifs } = await request("GET", "/notifications");
  log(
    `All notifications (${(allNotifs as unknown[]).length} total)`,
    allNotifs
  );

  // ── 9. Update & Delete ─────────────────────────────────────────────────────
  section("9 · Update & Delete");

  const { body: updatedTask2 } = await request("PUT", `/tasks/${task2Id}`, {
    title: "Implement responsive header",
    description: "Must work on mobile and desktop",
  });
  log("Updated task2 title + description", updatedTask2);

  const { body: updatedProject } = await request("PUT", `/projects/${projectId}`, {
    description: "Complete redesign — desktop and mobile",
  });
  log("Updated project description", updatedProject);

  // Delete task3 (also removes its comments)
  const { body: deleteTask3Result } = await request(
    "DELETE",
    `/tasks/${task3Id}`
  );
  log("Deleted task3", deleteTask3Result);

  // Verify task3 is gone
  const { status: missingTaskStatus, body: missingTask } = await request(
    "GET",
    `/tasks/${task3Id}`
  );
  log(
    `Fetch deleted task3 (expected 500, got ${missingTaskStatus})`,
    missingTask
  );

  // Delete a user
  const { body: deleteUserResult } = await request(
    "DELETE",
    `/users/${carolId}`
  );
  log("Deleted Carol", deleteUserResult);

  // ── 10. Error Cases ────────────────────────────────────────────────────────
  section("10 · Error Cases");

  // Duplicate email
  const { status: dupEmailStatus, body: dupEmailErr } = await request(
    "POST",
    "/users",
    { name: "Dup", email: "alice@example.com" }
  );
  log(`Duplicate email (expected 500, got ${dupEmailStatus})`, dupEmailErr);

  // Non-existent user
  const { status: noUserStatus, body: noUserErr } = await request(
    "GET",
    "/users/does-not-exist"
  );
  log(`Non-existent user (expected 500, got ${noUserStatus})`, noUserErr);

  // Task in non-existent project
  const { status: badProjStatus, body: badProjErr } = await request(
    "POST",
    "/tasks",
    { title: "Ghost task", projectId: "no-such-project" }
  );
  log(
    `Task in non-existent project (expected 404, got ${badProjStatus})`,
    badProjErr
  );

  // Unknown route
  const { status: notFoundStatus, body: notFoundErr } = await request(
    "GET",
    "/unknown/route"
  );
  log(`Unknown route (expected 404, got ${notFoundStatus})`, notFoundErr);

  // ── Done ───────────────────────────────────────────────────────────────────
  section("Demo Complete ✓");
  console.log("\nAll features exercised successfully!\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────

server.listen(DEMO_PORT, async () => {
  console.log(`\nDemo server started on http://localhost:${DEMO_PORT}`);
  try {
    await runDemo();
  } catch (err) {
    console.error("\nDemo failed:", err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log("Demo server shut down.\n");
    });
  }
});
