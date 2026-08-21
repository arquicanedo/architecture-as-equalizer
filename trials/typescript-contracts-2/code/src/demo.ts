/**
 * Demo script — exercises all features of the Task Management API.
 *
 * Run with: npx tsx src/demo.ts
 *
 * The script starts an HTTP server on a random port, performs a series of
 * HTTP requests that cover every route, validates responses, and then shuts
 * the server down gracefully.
 */

import { createApp } from "./main.js";

// ── Helpers ────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3001";

function log(section: string, msg: string, data?: unknown) {
  const prefix = `\n[${section}]`;
  if (data !== undefined) {
    console.log(prefix, msg, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, msg);
  }
}

function assert(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ FAILED: ${label}`, detail ?? "");
    process.exitCode = 1;
  }
}

async function req(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// ── Main Demo ──────────────────────────────────────────────────────────────

async function runDemo() {
  // Start server
  const { server } = createApp();
  await new Promise<void>((resolve) => server.listen(3001, resolve));
  console.log("=== Task Management API — Demo ===");
  console.log(`Server started on ${BASE_URL}\n`);

  try {
    // ── 1. Users ──────────────────────────────────────────────────────────
    log("Users", "Creating two users...");

    const { status: s1, data: alice } = await req("POST", "/users", {
      name: "Alice",
      email: "alice@example.com",
    });
    assert("Create Alice → 201", s1 === 201);
    assert("Alice has id", typeof (alice as { id: string }).id === "string");
    log("Users", "Alice:", alice);

    const { status: s2, data: bob } = await req("POST", "/users", {
      name: "Bob",
      email: "bob@example.com",
    });
    assert("Create Bob → 201", s2 === 201);
    log("Users", "Bob:", bob);

    const aliceId = (alice as { id: string }).id;
    const bobId = (bob as { id: string }).id;

    // GET all users
    const { status: s3, data: allUsers } = await req("GET", "/users");
    assert("GET /users → 200", s3 === 200);
    assert("Two users exist", (allUsers as unknown[]).length === 2);

    // GET by id
    const { status: s4, data: aliceFetched } = await req("GET", `/users/${aliceId}`);
    assert("GET /users/:id → 200", s4 === 200);
    assert("Alice name matches", (aliceFetched as { name: string }).name === "Alice");

    // PUT update
    const { status: s5, data: aliceUpdated } = await req("PUT", `/users/${aliceId}`, {
      name: "Alice Smith",
    });
    assert("PUT /users/:id → 200", s5 === 200);
    assert("Alice name updated", (aliceUpdated as { name: string }).name === "Alice Smith");

    // ── 2. Projects ───────────────────────────────────────────────────────
    log("Projects", "Creating a project...");

    const { status: p1, data: project } = await req("POST", "/projects", {
      name: "Apollo",
      description: "Mission to the moon",
    });
    assert("Create project → 201", p1 === 201);
    const projectId = (project as { id: string }).id;
    log("Projects", "Project:", project);

    // GET all projects
    const { status: p2, data: allProjects } = await req("GET", "/projects");
    assert("GET /projects → 200", p2 === 200);
    assert("One project exists", (allProjects as unknown[]).length === 1);

    // GET by id
    const { status: p3, data: projectFetched } = await req("GET", `/projects/${projectId}`);
    assert("GET /projects/:id → 200", p3 === 200);
    assert("Project name matches", (projectFetched as { name: string }).name === "Apollo");

    // Add members
    const { status: p4, data: projectWithAlice } = await req(
      "POST",
      `/projects/${projectId}/members`,
      { userId: aliceId }
    );
    assert("Add Alice to project → 200", p4 === 200);
    assert(
      "Alice in memberIds",
      (projectWithAlice as { memberIds: string[] }).memberIds.includes(aliceId)
    );

    const { status: p5, data: projectWithBob } = await req(
      "POST",
      `/projects/${projectId}/members`,
      { userId: bobId }
    );
    assert("Add Bob to project → 200", p5 === 200);
    assert(
      "Both members present",
      (projectWithBob as { memberIds: string[] }).memberIds.length === 2
    );
    log("Projects", "Project with members:", projectWithBob);

    // Remove Bob temporarily and re-add him
    const { status: p6 } = await req("DELETE", `/projects/${projectId}/members`, {
      userId: bobId,
    });
    assert("Remove Bob → 200", p6 === 200);

    await req("POST", `/projects/${projectId}/members`, { userId: bobId });

    // ── 3. Tasks ──────────────────────────────────────────────────────────
    log("Tasks", "Creating tasks...");

    const { status: t1, data: task1 } = await req("POST", "/tasks", {
      title: "Design landing module",
      description: "Create detailed specs for the landing module",
      projectId: projectId,
    });
    assert("Create task → 201", t1 === 201);
    const task1Id = (task1 as { id: string }).id;
    assert("Task status is todo", (task1 as { status: string }).status === "todo");
    log("Tasks", "Task 1:", task1);

    const { status: t2, data: task2 } = await req("POST", "/tasks", {
      title: "Write test plan",
      description: "Document the testing strategy",
      projectId: projectId,
    });
    assert("Create task 2 → 201", t2 === 201);
    const task2Id = (task2 as { id: string }).id;

    // GET by project
    const { status: t3, data: projectTasks } = await req(
      "GET",
      `/tasks?projectId=${projectId}`
    );
    assert("GET /tasks?projectId → 200", t3 === 200);
    assert("Two tasks in project", (projectTasks as unknown[]).length === 2);

    // GET by id
    const { status: t4, data: task1Fetched } = await req("GET", `/tasks/${task1Id}`);
    assert("GET /tasks/:id → 200", t4 === 200);
    assert(
      "Task title matches",
      (task1Fetched as { title: string }).title === "Design landing module"
    );

    // PUT update
    const { status: t5, data: task1Updated } = await req("PUT", `/tasks/${task1Id}`, {
      title: "Design landing module v2",
    });
    assert("PUT /tasks/:id → 200", t5 === 200);
    assert(
      "Task title updated",
      (task1Updated as { title: string }).title === "Design landing module v2"
    );

    // ── 4. Assign tasks ───────────────────────────────────────────────────
    log("Tasks", "Assigning tasks...");

    const { status: a1, data: assignedTask1 } = await req(
      "PUT",
      `/tasks/${task1Id}/assign`,
      { assigneeId: aliceId }
    );
    assert("Assign task1 to Alice → 200", a1 === 200);
    assert(
      "Task1 assigneeId = Alice",
      (assignedTask1 as { assigneeId: string }).assigneeId === aliceId
    );

    const { status: a2 } = await req("PUT", `/tasks/${task2Id}/assign`, {
      assigneeId: bobId,
    });
    assert("Assign task2 to Bob → 200", a2 === 200);

    // ── 5. Status transitions ─────────────────────────────────────────────
    log("Tasks", "Changing task statuses (forward-only state machine)...");

    // todo → in-progress
    const { status: st1, data: inProgress } = await req(
      "PUT",
      `/tasks/${task1Id}/status`,
      { status: "in-progress" }
    );
    assert("todo → in-progress → 200", st1 === 200);
    assert(
      "Status is in-progress",
      (inProgress as { status: string }).status === "in-progress"
    );

    // in-progress → done
    const { status: st2, data: done } = await req("PUT", `/tasks/${task1Id}/status`, {
      status: "done",
    });
    assert("in-progress → done → 200", st2 === 200);
    assert("Status is done", (done as { status: string }).status === "done");

    // Invalid: done → todo (should fail)
    const { status: st3, data: badTransition } = await req(
      "PUT",
      `/tasks/${task1Id}/status`,
      { status: "todo" }
    );
    assert("done → todo → 400 (rejected)", st3 === 400);
    assert("Error message present", typeof (badTransition as { error: string }).error === "string");
    log("Tasks", "Rejected backward transition:", badTransition);

    // Invalid: todo → done (skip, should fail)
    const { status: st4 } = await req("PUT", `/tasks/${task2Id}/status`, {
      status: "done",
    });
    assert("todo → done (skip) → 400 (rejected)", st4 === 400);

    // Advance task2 correctly
    await req("PUT", `/tasks/${task2Id}/status`, { status: "in-progress" });
    const { data: task2Done } = await req("PUT", `/tasks/${task2Id}/status`, { status: "done" });
    assert(
      "task2 correctly advanced to done",
      (task2Done as { status: string }).status === "done"
    );

    // ── 6. Comments ───────────────────────────────────────────────────────
    log("Comments", "Adding comments...");

    const { status: c1, data: comment1 } = await req("POST", "/comments", {
      taskId: task1Id,
      authorId: bobId,
      body: "Great job on the landing module design!",
    });
    assert("Create comment → 201", c1 === 201);
    const comment1Id = (comment1 as { id: string }).id;
    assert("Comment has createdAt", typeof (comment1 as { createdAt: string }).createdAt === "string");
    log("Comments", "Comment 1:", comment1);

    const { status: c2 } = await req("POST", "/comments", {
      taskId: task1Id,
      authorId: aliceId,
      body: "Thanks! I'll start on it next week.",
    });
    assert("Create comment 2 → 201", c2 === 201);

    // GET by task
    const { status: c3, data: taskComments } = await req(
      "GET",
      `/comments?taskId=${task1Id}`
    );
    assert("GET /comments?taskId → 200", c3 === 200);
    assert("Two comments on task", (taskComments as unknown[]).length === 2);

    // GET by id
    const { status: c4, data: comment1Fetched } = await req(
      "GET",
      `/comments/${comment1Id}`
    );
    assert("GET /comments/:id → 200", c4 === 200);
    assert(
      "Comment body matches",
      (comment1Fetched as { body: string }).body === "Great job on the landing module design!"
    );

    // DELETE comment
    const { status: c5 } = await req("DELETE", `/comments/${comment1Id}`);
    assert("DELETE /comments/:id → 204", c5 === 204);

    const { data: remainingComments } = await req("GET", `/comments?taskId=${task1Id}`);
    assert("One comment remains", (remainingComments as unknown[]).length === 1);

    // ── 7. Notifications ─────────────────────────────────────────────────
    log("Notifications", "Checking notifications...");

    // Alice was assigned task1 → should have "Task '...' assigned to you"
    // Alice's task1 was moved to in-progress, done → should have status-change notifications
    // Bob commented on task1 (assigned to Alice) → Alice should get a comment notification
    const { status: n1, data: aliceNotifs } = await req(
      "GET",
      `/notifications?userId=${aliceId}`
    );
    assert("GET /notifications?userId → 200", n1 === 200);
    const aliceNotifList = aliceNotifs as Array<{
      id: string;
      message: string;
      read: boolean;
    }>;
    log("Notifications", `Alice has ${aliceNotifList.length} notification(s):`, aliceNotifList);
    assert("Alice has notifications", aliceNotifList.length > 0);

    const assignedNotif = aliceNotifList.find((n) => n.message.includes("assigned to you"));
    assert("Alice got task-assigned notification", assignedNotif !== undefined);

    const statusNotif = aliceNotifList.find((n) =>
      n.message.includes("status changed to")
    );
    assert("Alice got status-change notification", statusNotif !== undefined);

    const commentNotif = aliceNotifList.find((n) => n.message.includes("commented on task"));
    assert("Alice got comment notification", commentNotif !== undefined);

    // Bob should have task-assigned and status-change notifications for task2
    const { data: bobNotifs } = await req("GET", `/notifications?userId=${bobId}`);
    const bobNotifList = bobNotifs as Array<{ id: string; message: string; read: boolean }>;
    log("Notifications", `Bob has ${bobNotifList.length} notification(s):`, bobNotifList);
    assert("Bob has notifications", bobNotifList.length > 0);

    // Mark a notification as read
    if (aliceNotifList.length > 0) {
      const notifId = aliceNotifList[0].id;
      const { status: n2, data: readNotif } = await req(
        "PUT",
        `/notifications/${notifId}/read`
      );
      assert("PUT /notifications/:id/read → 200", n2 === 200);
      assert("Notification marked as read", (readNotif as { read: boolean }).read === true);
      log("Notifications", "Marked as read:", readNotif);
    }

    // ── 8. Error cases ────────────────────────────────────────────────────
    log("Errors", "Verifying error handling...");

    const { status: e1 } = await req("GET", "/users/non-existent-id");
    assert("GET unknown user → 404", e1 === 404);

    const { status: e2 } = await req("GET", "/projects/non-existent-id");
    assert("GET unknown project → 404", e2 === 404);

    const { status: e3 } = await req("GET", "/tasks/non-existent-id");
    assert("GET unknown task → 404", e3 === 404);

    const { status: e4 } = await req("GET", "/tasks");
    assert("GET /tasks without projectId → 400", e4 === 400);

    const { status: e5 } = await req("GET", "/unknown-route");
    assert("Unknown route → 404", e5 === 404);

    // ── 9. Cleanup / DELETE ───────────────────────────────────────────────
    log("Cleanup", "Deleting resources...");

    const { status: d1 } = await req("DELETE", `/projects/${projectId}`);
    assert("DELETE /projects/:id → 204", d1 === 204);

    const { data: afterDelete } = await req("GET", "/projects");
    assert("No projects remain", (afterDelete as unknown[]).length === 0);

    const { status: d2 } = await req("DELETE", `/users/${aliceId}`);
    assert("DELETE /users/:id (Alice) → 204", d2 === 204);

    const { status: d3 } = await req("DELETE", `/users/${bobId}`);
    assert("DELETE /users/:id (Bob) → 204", d3 === 204);

    const { data: afterUserDelete } = await req("GET", "/users");
    assert("No users remain", (afterUserDelete as unknown[]).length === 0);

    console.log("\n=== Demo complete ===\n");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    console.log("Server stopped.");
  }
}

runDemo().catch((err) => {
  console.error("Demo failed with unexpected error:", err);
  process.exit(1);
});
