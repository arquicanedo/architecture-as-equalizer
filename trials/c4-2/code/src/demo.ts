/**
 * Demo script — starts the server and exercises all features end-to-end.
 *
 * Run with:  npx tsx src/demo.ts
 *
 * Flow:
 *  1. Create users (Alice, Bob, Carol)
 *  2. Create a project
 *  3. Add members to project
 *  4. Create tasks in the project
 *  5. Assign tasks to users
 *  6. Change task status (todo → in-progress → done)
 *  7. Try an invalid status transition (should error)
 *  8. Add comments to tasks
 *  9. Check notifications for each user
 * 10. Mark a notification as read
 * 11. Read individual resources
 * 12. Update resources
 * 13. Remove a member from project
 * 14. Delete a comment
 */

import { createServer } from "http";
import { eventBus } from "./event-bus";
import { userService } from "./services/user-service";
import { projectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { Router } from "./router";

// ── Server setup ──────────────────────────────────────────────────────────────

const PORT = 3001; // use a different port so it doesn't clash with main.ts

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
  router.handle(req, res).catch((err) => {
    console.error("[Server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function apiCall<T = unknown>(
  method: string,
  path: string,
  payload?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const bodyStr = payload !== undefined ? JSON.stringify(payload) : undefined;
    const options = {
      hostname: "localhost",
      port: PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = require("http").request(options, (res: any) => {
      let raw = "";
      res.on("data", (chunk: Buffer) => {
        raw += chunk.toString();
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) as T });
        } catch {
          reject(new Error(`Failed to parse response: ${raw}`));
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Logging helpers ───────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";

function header(title: string): void {
  console.log(`\n${BOLD}${CYAN}${"─".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${"─".repeat(60)}${RESET}`);
}

function log(label: string, value: unknown): void {
  console.log(`${GREEN}✓${RESET} ${YELLOW}${label}:${RESET}`);
  console.log(JSON.stringify(value, null, 2));
}

function logError(label: string, value: unknown): void {
  console.log(`${RED}✗${RESET} ${YELLOW}${label} (expected error):${RESET}`);
  console.log(JSON.stringify(value, null, 2));
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`${RED}ASSERTION FAILED: ${message}${RESET}`);
    process.exit(1);
  }
  console.log(`${GREEN}  ✓ ASSERT: ${message}${RESET}`);
}

// ── Demo main ─────────────────────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  console.log(`\n${BOLD}Task Management API — End-to-End Demo${RESET}`);
  console.log(`Server running on http://localhost:${PORT}\n`);

  // ── Step 1: Create Users ──────────────────────────────────────────────────
  header("Step 1: Create Users");

  const { body: alice } = await apiCall<any>("POST", "/users", {
    name: "Alice",
    email: "alice@example.com",
  });
  log("Created Alice", alice);
  assert(alice.id !== undefined, "Alice has an id");
  assert(alice.name === "Alice", "Alice's name is correct");

  const { body: bob } = await apiCall<any>("POST", "/users", {
    name: "Bob",
    email: "bob@example.com",
  });
  log("Created Bob", bob);

  const { body: carol } = await apiCall<any>("POST", "/users", {
    name: "Carol",
    email: "carol@example.com",
  });
  log("Created Carol", carol);

  const { body: allUsers } = await apiCall<any>("GET", "/users");
  log("All users (GET /users)", allUsers);
  assert(Array.isArray(allUsers) && allUsers.length === 3, "3 users exist");

  // ── Step 2: Create Project ────────────────────────────────────────────────
  header("Step 2: Create Project");

  const { body: project } = await apiCall<any>("POST", "/projects", {
    name: "Website Relaunch",
    description: "Redesign and rebuild the company website",
  });
  log("Created project", project);
  assert(project.memberIds.length === 0, "Project starts with no members");

  // ── Step 3: Add Members to Project ────────────────────────────────────────
  header("Step 3: Add Members to Project");

  const { body: projWithAlice } = await apiCall<any>(
    "POST",
    `/projects/${project.id}/members`,
    { userId: alice.id }
  );
  log("Added Alice to project", projWithAlice);

  const { body: projWithBob } = await apiCall<any>(
    "POST",
    `/projects/${project.id}/members`,
    { userId: bob.id }
  );
  log("Added Bob to project", projWithBob);

  const { body: projWithCarol } = await apiCall<any>(
    "POST",
    `/projects/${project.id}/members`,
    { userId: carol.id }
  );
  log("Added Carol to project", projWithCarol);
  assert(projWithCarol.memberIds.length === 3, "Project has 3 members");

  // ── Step 4: Create Tasks ──────────────────────────────────────────────────
  header("Step 4: Create Tasks");

  const { body: task1 } = await apiCall<any>("POST", "/tasks", {
    title: "Design homepage mockup",
    description: "Create wireframes and high-fidelity mockups for the new homepage",
    projectId: project.id,
  });
  log("Created task1", task1);
  assert(task1.status === "todo", "Task starts with 'todo' status");
  assert(task1.assigneeId === null, "Task starts unassigned");

  const { body: task2 } = await apiCall<any>("POST", "/tasks", {
    title: "Set up CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment",
    projectId: project.id,
  });
  log("Created task2", task2);

  const { body: task3 } = await apiCall<any>("POST", "/tasks", {
    title: "Write API documentation",
    description: "Document all REST endpoints using OpenAPI spec",
    projectId: project.id,
  });
  log("Created task3", task3);

  const { body: projectTasks } = await apiCall<any>(
    "GET",
    `/tasks?projectId=${project.id}`
  );
  log("Tasks for project (GET /tasks?projectId=...)", projectTasks);
  assert(projectTasks.length === 3, "Project has 3 tasks");

  // ── Step 5: Assign Tasks ──────────────────────────────────────────────────
  header("Step 5: Assign Tasks to Users");

  const { body: assignedTask1 } = await apiCall<any>(
    "PUT",
    `/tasks/${task1.id}/assign`,
    { assigneeId: alice.id }
  );
  log("Assigned task1 to Alice", assignedTask1);
  assert(assignedTask1.assigneeId === alice.id, "task1 assignee is Alice");

  const { body: assignedTask2 } = await apiCall<any>(
    "PUT",
    `/tasks/${task2.id}/assign`,
    { assigneeId: bob.id }
  );
  log("Assigned task2 to Bob", assignedTask2);

  const { body: assignedTask3 } = await apiCall<any>(
    "PUT",
    `/tasks/${task3.id}/assign`,
    { assigneeId: carol.id }
  );
  log("Assigned task3 to Carol", assignedTask3);

  // Verify notifications were generated for assignments
  const { body: aliceNotifs1 } = await apiCall<any>(
    "GET",
    `/notifications?userId=${alice.id}`
  );
  log("Alice's notifications after assignment", aliceNotifs1);
  assert(aliceNotifs1.length >= 1, "Alice has at least 1 notification");
  assert(
    aliceNotifs1.some((n: any) => n.message.includes("assigned")),
    "Alice has assignment notification"
  );

  // ── Step 6: Change Task Status ────────────────────────────────────────────
  header("Step 6: Change Task Status (todo → in-progress → done)");

  const { body: task1InProgress } = await apiCall<any>(
    "PUT",
    `/tasks/${task1.id}/status`,
    { status: "in-progress" }
  );
  log("task1 status → in-progress", task1InProgress);
  assert(task1InProgress.status === "in-progress", "task1 is in-progress");

  const { body: task1Done } = await apiCall<any>(
    "PUT",
    `/tasks/${task1.id}/status`,
    { status: "done" }
  );
  log("task1 status → done", task1Done);
  assert(task1Done.status === "done", "task1 is done");

  const { body: task2InProgress } = await apiCall<any>(
    "PUT",
    `/tasks/${task2.id}/status`,
    { status: "in-progress" }
  );
  log("task2 status → in-progress", task2InProgress);

  // ── Step 7: Invalid Status Transition ─────────────────────────────────────
  header("Step 7: Invalid Status Transition (expected error)");

  // Attempt: done → todo (should fail)
  const { status: badStatus, body: badTransition } = await apiCall<any>(
    "PUT",
    `/tasks/${task1.id}/status`,
    { status: "todo" }
  );
  logError(`task1 done → todo (HTTP ${badStatus})`, badTransition);
  assert(badStatus === 500, "Server returns error for invalid transition");
  assert(
    badTransition.error.includes("Invalid status transition"),
    "Error message mentions invalid transition"
  );

  // Attempt: todo → done (skip in-progress)
  const { status: skipStatus, body: skipBody } = await apiCall<any>(
    "PUT",
    `/tasks/${task3.id}/status`,
    { status: "done" }
  );
  logError(`task3 todo → done skipping in-progress (HTTP ${skipStatus})`, skipBody);
  assert(skipStatus === 500, "Server returns error for skipped transition");

  // ── Step 8: Add Comments ──────────────────────────────────────────────────
  header("Step 8: Add Comments to Tasks");

  const { body: comment1 } = await apiCall<any>("POST", "/comments", {
    taskId: task1.id,
    authorId: bob.id,
    body: "Great work on the mockups! The color scheme looks fantastic.",
  });
  log("Bob commented on task1", comment1);
  assert(comment1.taskId === task1.id, "comment1 taskId is correct");
  assert(comment1.authorId === bob.id, "comment1 authorId is Bob");

  const { body: comment2 } = await apiCall<any>("POST", "/comments", {
    taskId: task1.id,
    authorId: carol.id,
    body: "I agree! Can we also look at mobile responsiveness?",
  });
  log("Carol commented on task1", comment2);

  const { body: comment3 } = await apiCall<any>("POST", "/comments", {
    taskId: task2.id,
    authorId: alice.id,
    body: "I've added some notes on the build matrix. Check the wiki.",
  });
  log("Alice commented on task2", comment3);

  const { body: task1Comments } = await apiCall<any>(
    "GET",
    `/comments?taskId=${task1.id}`
  );
  log("Comments on task1 (GET /comments?taskId=...)", task1Comments);
  assert(task1Comments.length === 2, "task1 has 2 comments");

  // ── Step 9: Check Notifications ───────────────────────────────────────────
  header("Step 9: Check Notifications for Each User");

  const { body: aliceNotifs } = await apiCall<any>(
    "GET",
    `/notifications?userId=${alice.id}`
  );
  log(`Alice's notifications (${aliceNotifs.length} total)`, aliceNotifs);

  const { body: bobNotifs } = await apiCall<any>(
    "GET",
    `/notifications?userId=${bob.id}`
  );
  log(`Bob's notifications (${bobNotifs.length} total)`, bobNotifs);
  // Bob should have: assigned to task2, comment posted (alice's comment on task2),
  // and his own comment posted notification
  assert(bobNotifs.length >= 1, "Bob has notifications");

  const { body: carolNotifs } = await apiCall<any>(
    "GET",
    `/notifications?userId=${carol.id}`
  );
  log(`Carol's notifications (${carolNotifs.length} total)`, carolNotifs);

  // Alice was the assignee of task1 — Bob and Carol both commented on it,
  // so Alice should be notified of those comments
  assert(
    aliceNotifs.some((n: any) => n.message.includes("commented")),
    "Alice was notified about comments on her task"
  );

  // ── Step 10: Mark Notification as Read ────────────────────────────────────
  header("Step 10: Mark Notification as Read");

  const firstAliceNotif = aliceNotifs[0];
  assert(firstAliceNotif.read === false, "Notification starts unread");

  const { body: readNotif } = await apiCall<any>(
    "PUT",
    `/notifications/${firstAliceNotif.id}/read`
  );
  log("Marked notification as read", readNotif);
  assert(readNotif.read === true, "Notification is now read");

  // ── Step 11: Read Individual Resources ───────────────────────────────────
  header("Step 11: Read Individual Resources");

  const { body: fetchedUser } = await apiCall<any>("GET", `/users/${alice.id}`);
  log("GET /users/:id (Alice)", fetchedUser);
  assert(fetchedUser.id === alice.id, "Fetched correct user");

  const { body: fetchedProject } = await apiCall<any>(
    "GET",
    `/projects/${project.id}`
  );
  log("GET /projects/:id", fetchedProject);

  const { body: fetchedTask } = await apiCall<any>(
    "GET",
    `/tasks/${task2.id}`
  );
  log("GET /tasks/:id (task2)", fetchedTask);

  const { body: fetchedComment } = await apiCall<any>(
    "GET",
    `/comments/${comment1.id}`
  );
  log("GET /comments/:id (comment1)", fetchedComment);

  // ── Step 12: Update Resources ─────────────────────────────────────────────
  header("Step 12: Update Resources");

  const { body: updatedUser } = await apiCall<any>("PUT", `/users/${bob.id}`, {
    name: "Robert",
    email: "robert@example.com",
  });
  log("Updated Bob → Robert", updatedUser);
  assert(updatedUser.name === "Robert", "User name updated");

  const { body: updatedProject } = await apiCall<any>(
    "PUT",
    `/projects/${project.id}`,
    { description: "Full redesign and rebuild of the company website — v2" }
  );
  log("Updated project description", updatedProject);

  const { body: updatedTask } = await apiCall<any>(
    "PUT",
    `/tasks/${task3.id}`,
    { title: "Write comprehensive API documentation" }
  );
  log("Updated task3 title", updatedTask);
  assert(
    updatedTask.title === "Write comprehensive API documentation",
    "Task title updated"
  );

  // ── Step 13: Remove Member from Project ───────────────────────────────────
  header("Step 13: Remove Member from Project");

  const { body: projAfterRemoval } = await apiCall<any>(
    "DELETE",
    `/projects/${project.id}/members`,
    { userId: carol.id }
  );
  log("Removed Carol from project", projAfterRemoval);
  assert(
    !projAfterRemoval.memberIds.includes(carol.id),
    "Carol is no longer a member"
  );
  assert(projAfterRemoval.memberIds.length === 2, "Project now has 2 members");

  // ── Step 14: Delete Comment ───────────────────────────────────────────────
  header("Step 14: Delete Comment");

  const { body: deleteResult } = await apiCall<any>(
    "DELETE",
    `/comments/${comment2.id}`
  );
  log("Deleted comment2", deleteResult);
  assert(deleteResult.deleted === true, "Comment deleted");

  const { body: task1CommentsAfter } = await apiCall<any>(
    "GET",
    `/comments?taskId=${task1.id}`
  );
  log("task1 comments after deletion", task1CommentsAfter);
  assert(task1CommentsAfter.length === 1, "task1 now has 1 comment");

  // ── Step 15: Verify Not Found Errors ──────────────────────────────────────
  header("Step 15: Verify 404-like Errors for Missing Resources");

  const { status: missingUserStatus, body: missingUser } = await apiCall<any>(
    "GET",
    "/users/non-existent-id"
  );
  logError(`GET /users/non-existent-id (HTTP ${missingUserStatus})`, missingUser);
  assert(missingUserStatus === 500, "Returns error for missing user");

  // ── Step 16: Status Transition for Task3 ─────────────────────────────────
  header("Step 16: Valid Status Transition for task3 (todo → in-progress)");

  const { body: task3Progress } = await apiCall<any>(
    "PUT",
    `/tasks/${task3.id}/status`,
    { status: "in-progress" }
  );
  log("task3 status → in-progress", task3Progress);
  assert(task3Progress.status === "in-progress", "task3 is now in-progress");

  // ── Final Summary ─────────────────────────────────────────────────────────
  header("Demo Complete — Final State Summary");

  const { body: finalUsers } = await apiCall<any>("GET", "/users");
  const { body: finalProjects } = await apiCall<any>("GET", "/projects");
  const { body: finalTasks } = await apiCall<any>(
    "GET",
    `/tasks?projectId=${project.id}`
  );
  const { body: finalAliceNotifs } = await apiCall<any>(
    "GET",
    `/notifications?userId=${alice.id}`
  );
  const { body: finalBobNotifs } = await apiCall<any>(
    "GET",
    `/notifications?userId=${bob.id}`
  );
  const { body: finalCarolNotifs } = await apiCall<any>(
    "GET",
    `/notifications?userId=${carol.id}`
  );

  console.log(`\n${BOLD}Users:${RESET}`, finalUsers.length);
  console.log(`${BOLD}Projects:${RESET}`, finalProjects.length);
  console.log(`${BOLD}Tasks:${RESET}`, finalTasks.length);
  console.log(`${BOLD}Task statuses:${RESET}`, finalTasks.map((t: any) => `${t.title}: ${t.status}`));
  console.log(`${BOLD}Alice's notifications:${RESET}`, finalAliceNotifs.length);
  console.log(`${BOLD}Bob's notifications:${RESET}`, finalBobNotifs.length);
  console.log(`${BOLD}Carol's notifications:${RESET}`, finalCarolNotifs.length);

  console.log(`\n${BOLD}${GREEN}All demo steps completed successfully! ✓${RESET}\n`);
}

// ── Start and run ─────────────────────────────────────────────────────────────

server.listen(PORT, async () => {
  console.log(`[Demo] Server started on http://localhost:${PORT}`);
  try {
    await runDemo();
  } catch (err) {
    console.error(`${RED}[Demo] Fatal error:${RESET}`, err);
    process.exit(1);
  } finally {
    server.close(() => {
      console.log("[Demo] Server closed.");
      process.exit(0);
    });
  }
});
