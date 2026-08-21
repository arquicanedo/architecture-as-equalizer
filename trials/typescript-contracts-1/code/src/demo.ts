/**
 * Demo script — exercises the full Task Management API end-to-end.
 * Starts its own HTTP server on a demo port, runs through all major
 * flows, then shuts down.
 *
 * Run with:  npx tsx src/demo.ts
 */

import { buildApp } from "./main";

const DEMO_PORT = 3001;

// ----------------------------------------------------------------
// HTTP helper — uses Node's built-in http module (no fetch needed)
// ----------------------------------------------------------------

import { request as httpRequest } from "http";

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function apiCall<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options = {
      hostname: "localhost",
      port: DEMO_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = httpRequest(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const text = Buffer.concat(chunks).toString("utf-8");
          const json = text ? (JSON.parse(text) as T) : (null as unknown as T);
          resolve({ status: res.statusCode ?? 0, body: json });
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

// ----------------------------------------------------------------
// Logging helpers
// ----------------------------------------------------------------

function log(label: string, data: unknown): void {
  console.log(`\n  ✓ ${label}`);
  console.log("   ", JSON.stringify(data, null, 2).replace(/\n/g, "\n    "));
}

function section(title: string): void {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ASSERT: ${message}`);
}

// ----------------------------------------------------------------
// Main demo
// ----------------------------------------------------------------

async function runDemo(): Promise<void> {
  // ── Start server ────────────────────────────────────────────────
  const { server } = buildApp();
  await new Promise<void>((resolve) => server.listen(DEMO_PORT, resolve));
  console.log(`\n🚀 Demo server started on http://localhost:${DEMO_PORT}`);

  try {
    // ── 1. Create Users ────────────────────────────────────────────
    section("1. Create Users");

    const { body: alice } = await apiCall<{ id: string; name: string; email: string }>(
      "POST",
      "/users",
      { name: "Alice", email: "alice@example.com" }
    );
    log("Created user Alice", alice);
    assert(alice.name === "Alice", "Alice has correct name");

    const { body: bob } = await apiCall<{ id: string; name: string; email: string }>(
      "POST",
      "/users",
      { name: "Bob", email: "bob@example.com" }
    );
    log("Created user Bob", bob);

    const { body: allUsers } = await apiCall("GET", "/users");
    log("All users", allUsers);
    assert(Array.isArray(allUsers) && (allUsers as unknown[]).length === 2, "Two users exist");

    // ── 2. Create Project ──────────────────────────────────────────
    section("2. Create Project");

    const { body: project } = await apiCall<{
      id: string;
      name: string;
      memberIds: string[];
    }>("POST", "/projects", { name: "Apollo", description: "Mission to the moon" });
    log("Created project", project);
    assert(project.name === "Apollo", "Project has correct name");
    assert(project.memberIds.length === 0, "Project starts with no members");

    // ── 3. Add Members ─────────────────────────────────────────────
    section("3. Add Members to Project");

    const { body: projectWithAlice } = await apiCall<{ memberIds: string[] }>(
      "POST",
      `/projects/${project.id}/members`,
      { userId: alice.id }
    );
    log("Added Alice to project", projectWithAlice);
    assert(projectWithAlice.memberIds.includes(alice.id), "Alice is a member");

    const { body: projectWithBoth } = await apiCall<{ memberIds: string[] }>(
      "POST",
      `/projects/${project.id}/members`,
      { userId: bob.id }
    );
    log("Added Bob to project", projectWithBoth);
    assert(projectWithBoth.memberIds.includes(bob.id), "Bob is a member");

    // ── 4. Create Tasks ────────────────────────────────────────────
    section("4. Create Tasks");

    const { body: task1 } = await apiCall<{
      id: string;
      title: string;
      status: string;
      assigneeId: string | null;
    }>("POST", "/tasks", {
      title: "Design architecture",
      description: "Create system design docs",
      projectId: project.id,
    });
    log("Created task 1", task1);
    assert(task1.status === "todo", "Task starts as 'todo'");
    assert(task1.assigneeId === null, "Task starts unassigned");

    const { body: task2 } = await apiCall<{
      id: string;
      title: string;
      status: string;
    }>("POST", "/tasks", {
      title: "Implement API",
      description: "Build all REST endpoints",
      projectId: project.id,
    });
    log("Created task 2", task2);

    const { body: projectTasks } = await apiCall("GET", `/tasks?projectId=${project.id}`);
    log("Tasks in project", projectTasks);
    assert(
      Array.isArray(projectTasks) && (projectTasks as unknown[]).length === 2,
      "Two tasks in project"
    );

    // ── 5. Assign Tasks ────────────────────────────────────────────
    section("5. Assign Tasks → triggers task.assigned notifications");

    const { body: assignedTask1 } = await apiCall<{ assigneeId: string }>(
      "PUT",
      `/tasks/${task1.id}/assign`,
      { assigneeId: alice.id }
    );
    log("Assigned task1 to Alice", assignedTask1);
    assert(assignedTask1.assigneeId === alice.id, "Task1 assigned to Alice");

    const { body: assignedTask2 } = await apiCall<{ assigneeId: string }>(
      "PUT",
      `/tasks/${task2.id}/assign`,
      { assigneeId: bob.id }
    );
    log("Assigned task2 to Bob", assignedTask2);
    assert(assignedTask2.assigneeId === bob.id, "Task2 assigned to Bob");

    // ── 6. Check Notifications after assignment ────────────────────
    section("6. Check Notifications (post-assignment)");

    const { body: aliceNotifs } = await apiCall<
      { id: string; message: string; read: boolean }[]
    >("GET", `/notifications?userId=${alice.id}`);
    log("Alice's notifications", aliceNotifs);
    assert(aliceNotifs.length >= 1, "Alice has at least one notification");
    assert(
      aliceNotifs.some((n) => n.message.includes("assigned to you")),
      "Alice got task.assigned notification"
    );

    const { body: bobNotifs } = await apiCall<
      { id: string; message: string; read: boolean }[]
    >("GET", `/notifications?userId=${bob.id}`);
    log("Bob's notifications", bobNotifs);
    assert(bobNotifs.length >= 1, "Bob has at least one notification");

    // ── 7. Mark Notification as Read ──────────────────────────────
    section("7. Mark Notification as Read");

    const aliceFirstNotif = aliceNotifs[0];
    const { body: readNotif } = await apiCall<{ id: string; read: boolean }>(
      "PUT",
      `/notifications/${aliceFirstNotif.id}/read`
    );
    log("Marked Alice's notification as read", readNotif);
    assert(readNotif.read === true, "Notification marked as read");

    // ── 8. Change Task Status (forward transitions) ────────────────
    section("8. Change Task Status (todo → in-progress → done)");

    const { body: inProgress } = await apiCall<{ status: string }>(
      "PUT",
      `/tasks/${task1.id}/status`,
      { status: "in-progress" }
    );
    log("Task1: todo → in-progress", inProgress);
    assert(inProgress.status === "in-progress", "Task1 is in-progress");

    const { body: doneTask } = await apiCall<{ status: string }>(
      "PUT",
      `/tasks/${task1.id}/status`,
      { status: "done" }
    );
    log("Task1: in-progress → done", doneTask);
    assert(doneTask.status === "done", "Task1 is done");

    // ── 9. Reject Backward Status Transition ──────────────────────
    section("9. Reject Invalid (backward/skip) Status Transitions");

    const { status: backwardStatus, body: backwardBody } = await apiCall(
      "PUT",
      `/tasks/${task1.id}/status`,
      { status: "todo" }
    );
    log("Attempted done → todo (should fail)", { status: backwardStatus, body: backwardBody });
    assert(backwardStatus === 400, "Backward transition rejected with 400");

    const { status: skipStatus, body: skipBody } = await apiCall(
      "PUT",
      `/tasks/${task2.id}/status`,
      { status: "done" }
    );
    log("Attempted todo → done skip (should fail)", { status: skipStatus, body: skipBody });
    assert(skipStatus === 400, "Skipped transition rejected with 400");

    const { status: backwardStatus2, body: backwardBody2 } = await apiCall(
      "PUT",
      `/tasks/${task1.id}/status`,
      { status: "in-progress" }
    );
    log("Attempted done → in-progress (should fail)", {
      status: backwardStatus2,
      body: backwardBody2,
    });
    assert(backwardStatus2 === 400, "done → in-progress rejected with 400");

    // ── 10. Check Status-Changed Notifications ─────────────────────
    section("10. Check Notifications (post status change)");

    const { body: aliceNotifsUpdated } = await apiCall<{ message: string }[]>(
      "GET",
      `/notifications?userId=${alice.id}`
    );
    log("Alice's updated notifications", aliceNotifsUpdated);
    assert(
      aliceNotifsUpdated.some((n) => n.message.includes("status changed")),
      "Alice got status-changed notifications"
    );

    // ── 11. Add Comments ───────────────────────────────────────────
    section("11. Add Comments → triggers comment.added notifications");

    const { body: comment1 } = await apiCall<{
      id: string;
      body: string;
      taskId: string;
    }>("POST", "/comments", {
      taskId: task2.id,
      authorId: alice.id,
      body: "Looking good, Bob! Any blockers?",
    });
    log("Alice commented on task2", comment1);
    assert(comment1.body === "Looking good, Bob! Any blockers?", "Comment body matches");

    const { body: comment2 } = await apiCall<{ id: string; body: string }>(
      "POST",
      "/comments",
      {
        taskId: task1.id,
        authorId: bob.id,
        body: "Great work on the architecture!",
      }
    );
    log("Bob commented on task1 (Alice's completed task)", comment2);

    // ── 12. Get Comments by Task ───────────────────────────────────
    section("12. Get Comments by Task");

    const { body: task2Comments } = await apiCall("GET", `/comments?taskId=${task2.id}`);
    log("Comments on task2", task2Comments);
    assert(
      Array.isArray(task2Comments) && (task2Comments as unknown[]).length === 1,
      "task2 has one comment"
    );

    const { body: singleComment } = await apiCall("GET", `/comments/${comment1.id}`);
    log("Get comment by ID", singleComment);

    // ── 13. Check comment notifications ───────────────────────────
    section("13. Check Notifications (post comment)");

    const { body: bobNotifsAfterComment } = await apiCall<{ message: string }[]>(
      "GET",
      `/notifications?userId=${bob.id}`
    );
    log("Bob's notifications (should include comment notif)", bobNotifsAfterComment);
    assert(
      bobNotifsAfterComment.some((n) => n.message.includes("commented")),
      "Bob got comment notification (Alice commented on his task)"
    );

    // ── 14. Update Resources ───────────────────────────────────────
    section("14. Update User and Project");

    const { body: updatedAlice } = await apiCall<{ name: string }>(
      "PUT",
      `/users/${alice.id}`,
      { name: "Alice Smith" }
    );
    log("Updated Alice's name", updatedAlice);
    assert(updatedAlice.name === "Alice Smith", "Alice's name updated");

    const { body: updatedProject } = await apiCall<{ description: string }>(
      "PUT",
      `/projects/${project.id}`,
      { description: "Mission to the moon — Phase 2" }
    );
    log("Updated project description", updatedProject);
    assert(
      updatedProject.description.includes("Phase 2"),
      "Project description updated"
    );

    // ── 15. Remove Member ──────────────────────────────────────────
    section("15. Remove Member from Project");

    const { body: projectAfterRemove } = await apiCall<{ memberIds: string[] }>(
      "DELETE",
      `/projects/${project.id}/members`,
      { userId: bob.id }
    );
    log("Removed Bob from project", projectAfterRemove);
    assert(!projectAfterRemove.memberIds.includes(bob.id), "Bob removed from project");

    // ── 16. Delete Comment ─────────────────────────────────────────
    section("16. Delete Comment");

    const { status: deleteCommentStatus } = await apiCall("DELETE", `/comments/${comment2.id}`);
    assert(deleteCommentStatus === 204, "Comment deleted (204)");

    const { body: task1CommentsAfter } = await apiCall("GET", `/comments?taskId=${task1.id}`);
    assert(
      Array.isArray(task1CommentsAfter) && (task1CommentsAfter as unknown[]).length === 0,
      "task1 now has no comments"
    );

    // ── 17. 404 Handling ───────────────────────────────────────────
    section("17. Not Found Handling");

    const { status: notFoundStatus, body: notFoundBody } = await apiCall(
      "GET",
      "/users/nonexistent-id"
    );
    log("Get non-existent user", { status: notFoundStatus, body: notFoundBody });
    assert(notFoundStatus === 404, "Returns 404 for missing user");

    const { status: noRouteStatus, body: noRouteBody } = await apiCall("GET", "/unknown-route");
    log("Unknown route", { status: noRouteStatus, body: noRouteBody });
    assert(noRouteStatus === 404, "Unknown routes return 404");

    // ── 18. Delete Task and User ───────────────────────────────────
    section("18. Delete Task and User");

    const { status: deleteTaskStatus } = await apiCall("DELETE", `/tasks/${task2.id}`);
    assert(deleteTaskStatus === 204, "Task2 deleted (204)");

    const { status: deleteUserStatus } = await apiCall("DELETE", `/users/${bob.id}`);
    assert(deleteUserStatus === 204, "Bob deleted (204)");

    const { body: finalUsers } = await apiCall("GET", "/users");
    assert(
      Array.isArray(finalUsers) && (finalUsers as unknown[]).length === 1,
      "Only Alice remains"
    );

    // ── 19. Get project by ID ──────────────────────────────────────
    section("19. Get Project by ID");

    const { body: fetchedProject } = await apiCall<{ id: string; name: string }>(
      "GET",
      `/projects/${project.id}`
    );
    log("Fetched project by ID", fetchedProject);
    assert(fetchedProject.id === project.id, "Fetched correct project");

    // ── 20. Get all projects ───────────────────────────────────────
    section("20. Get All Projects");

    const { body: allProjects } = await apiCall("GET", "/projects");
    log("All projects", allProjects);
    assert(
      Array.isArray(allProjects) && (allProjects as unknown[]).length === 1,
      "One project exists"
    );

    // ── Done ────────────────────────────────────────────────────────
    console.log("\n" + "═".repeat(60));
    console.log("  ✅ All demo steps completed successfully!");
    console.log("═".repeat(60) + "\n");
  } finally {
    server.close();
  }
}

runDemo().catch((err: unknown) => {
  console.error("\n❌ Demo failed:", err);
  process.exit(1);
});
