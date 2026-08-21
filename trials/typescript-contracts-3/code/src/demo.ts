// ============================================================
// Demo Script — exercises all features end-to-end
// ============================================================

import { server } from "./main";

const BASE = "http://localhost:3000";

// ---- HTTP helper --------------------------------------------

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const url = `${BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  return { status: res.status, data };
}

function log(label: string, data: unknown): void {
  console.log(`\n── ${label} ──`);
  console.log(JSON.stringify(data, null, 2));
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

// ---- Main demo flow -----------------------------------------

async function runDemo(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  Task Management API — Demo");
  console.log("=".repeat(60));

  // ── 1. Create Users ──────────────────────────────────────
  console.log("\n[1] Create users");

  const { status: s1, data: alice } = await request<{ id: string; name: string; email: string }>(
    "POST", "/users", { name: "Alice", email: "alice@example.com" }
  );
  assert(s1 === 201, "Create Alice → 201");
  log("Alice", alice);

  const { data: bob } = await request<{ id: string; name: string; email: string }>(
    "POST", "/users", { name: "Bob", email: "bob@example.com" }
  );
  log("Bob", bob);

  const { data: carol } = await request<{ id: string; name: string; email: string }>(
    "POST", "/users", { name: "Carol", email: "carol@example.com" }
  );
  log("Carol", carol);

  // ── 2. Get all users ─────────────────────────────────────
  console.log("\n[2] Get all users");
  const { status: s2, data: allUsers } = await request<unknown[]>("GET", "/users");
  assert(s2 === 200, "GET /users → 200");
  assert(Array.isArray(allUsers) && allUsers.length === 3, "Three users exist");
  log("All users", allUsers);

  // ── 3. Update a user ─────────────────────────────────────
  console.log("\n[3] Update Alice's email");
  const { status: s3, data: aliceUpdated } = await request<{ email: string }>(
    "PUT", `/users/${alice.id}`, { email: "alice@updated.com" }
  );
  assert(s3 === 200, "PUT /users/:id → 200");
  assert((aliceUpdated as { email: string }).email === "alice@updated.com", "Email updated");
  log("Alice updated", aliceUpdated);

  // ── 4. Create a project ──────────────────────────────────
  console.log("\n[4] Create project");
  const { status: s4, data: project } = await request<{ id: string; name: string; memberIds: string[] }>(
    "POST", "/projects", { name: "Alpha", description: "Alpha project" }
  );
  assert(s4 === 201, "Create project → 201");
  log("Project", project);

  // ── 5. Add members ───────────────────────────────────────
  console.log("\n[5] Add members to project");
  const { status: s5a, data: projWithAlice } = await request<{ memberIds: string[] }>(
    "POST", `/projects/${project.id}/members`, { userId: alice.id }
  );
  assert(s5a === 200, "Add Alice → 200");
  assert((projWithAlice as { memberIds: string[] }).memberIds.includes(alice.id), "Alice in members");

  await request("POST", `/projects/${project.id}/members`, { userId: bob.id });
  const { data: projWithBoth } = await request<{ memberIds: string[] }>(
    "POST", `/projects/${project.id}/members`, { userId: carol.id }
  );
  assert((projWithBoth as { memberIds: string[] }).memberIds.length === 3, "Three members");
  log("Project with members", projWithBoth);

  // ── 6. Remove a member ───────────────────────────────────
  console.log("\n[6] Remove Carol from project");
  const { status: s6, data: projAfterRemove } = await request<{ memberIds: string[] }>(
    "DELETE", `/projects/${project.id}/members`, { userId: carol.id }
  );
  assert(s6 === 200, "Remove Carol → 200");
  assert(!(projAfterRemove as { memberIds: string[] }).memberIds.includes(carol.id), "Carol removed");
  log("Project after remove", projAfterRemove);

  // ── 7. Create tasks ──────────────────────────────────────
  console.log("\n[7] Create tasks");
  const { status: s7, data: taskA } = await request<{ id: string; title: string; status: string; assigneeId: string | null }>(
    "POST", "/tasks", { title: "Task A", description: "First task", projectId: project.id }
  );
  assert(s7 === 201, "Create Task A → 201");
  assert((taskA as { status: string }).status === "todo", "Task A starts as 'todo'");
  log("Task A", taskA);

  const { data: taskB } = await request<{ id: string; title: string; status: string; assigneeId: string | null }>(
    "POST", "/tasks", { title: "Task B", description: "Second task", projectId: project.id }
  );
  log("Task B", taskB);

  // ── 8. Get tasks by project ──────────────────────────────
  console.log("\n[8] Get tasks by project");
  const { status: s8, data: projectTasks } = await request<unknown[]>(
    "GET", `/tasks?projectId=${project.id}`
  );
  assert(s8 === 200, "GET /tasks?projectId → 200");
  assert(Array.isArray(projectTasks) && projectTasks.length === 2, "Two tasks in project");
  log("Project tasks", projectTasks);

  // ── 9. Update a task ─────────────────────────────────────
  console.log("\n[9] Update Task A title");
  const { status: s9, data: taskAUpdated } = await request<{ title: string }>(
    "PUT", `/tasks/${taskA.id}`, { title: "Task A (revised)" }
  );
  assert(s9 === 200, "PUT /tasks/:id → 200");
  assert((taskAUpdated as { title: string }).title === "Task A (revised)", "Title updated");
  log("Task A updated", taskAUpdated);

  // ── 10. Assign tasks (triggers notifications) ────────────
  console.log("\n[10] Assign tasks");
  const { status: s10, data: taskAAssigned } = await request<{ assigneeId: string }>(
    "PUT", `/tasks/${taskA.id}/assign`, { assigneeId: alice.id }
  );
  assert(s10 === 200, "Assign Task A to Alice → 200");
  assert((taskAAssigned as { assigneeId: string }).assigneeId === alice.id, "Task A assigned to Alice");
  log("Task A assigned", taskAAssigned);

  await request("PUT", `/tasks/${taskB.id}/assign`, { assigneeId: bob.id });
  log("Task B assigned to Bob", { assigneeId: bob.id });

  // ── 11. Check notifications after assignment ─────────────
  console.log("\n[11] Check Alice's notifications (task assignment)");
  const { status: s11, data: aliceNotifs } = await request<Array<{ id: string; message: string; read: boolean }>>(
    "GET", `/notifications?userId=${alice.id}`
  );
  assert(s11 === 200, "GET /notifications → 200");
  assert(
    Array.isArray(aliceNotifs) && aliceNotifs.length >= 1,
    "Alice has at least 1 notification"
  );
  assert(
    aliceNotifs.some((n) => n.message.includes("assigned to you")),
    "Assignment notification received"
  );
  log("Alice's notifications", aliceNotifs);

  // ── 12. Change task status (state machine) ───────────────
  console.log("\n[12] Change Task A status: todo → in-progress → done");

  const { status: s12a, data: taskAInProgress } = await request<{ status: string }>(
    "PUT", `/tasks/${taskA.id}/status`, { status: "in-progress" }
  );
  assert(s12a === 200, "todo → in-progress → 200");
  assert((taskAInProgress as { status: string }).status === "in-progress", "Status is in-progress");
  log("Task A in-progress", taskAInProgress);

  const { status: s12b, data: taskADone } = await request<{ status: string }>(
    "PUT", `/tasks/${taskA.id}/status`, { status: "done" }
  );
  assert(s12b === 200, "in-progress → done → 200");
  assert((taskADone as { status: string }).status === "done", "Status is done");
  log("Task A done", taskADone);

  // ── 13. Test invalid status transitions ──────────────────
  console.log("\n[13] Test invalid status transitions (expect 422)");

  // Try to transition from done → in-progress (backward)
  const { status: s13a, data: errBackward } = await request<{ error: string }>(
    "PUT", `/tasks/${taskA.id}/status`, { status: "in-progress" }
  );
  assert(s13a === 422, "done → in-progress rejected with 422");
  log("Backward transition error", errBackward);

  // Try to transition from done → todo (backward)
  const { status: s13b } = await request(
    "PUT", `/tasks/${taskA.id}/status`, { status: "todo" }
  );
  assert(s13b === 422, "done → todo rejected with 422");

  // Try to skip: todo → done (skip)
  const { data: taskB_fresh } = await request<{ id: string; status: string }>("GET", `/tasks/${taskB.id}`);
  // taskB is still 'todo' at this point
  const { status: s13c, data: errSkip } = await request<{ error: string }>(
    "PUT", `/tasks/${taskB.id}/status`, { status: "done" }
  );
  assert(s13c === 422, "todo → done (skip) rejected with 422");
  log("Skip transition error", errSkip);
  void taskB_fresh;

  // ── 14. Status-change notifications ──────────────────────
  console.log("\n[14] Check Alice's notifications after status changes");
  const { data: aliceNotifs2 } = await request<Array<{ message: string }>>(
    "GET", `/notifications?userId=${alice.id}`
  );
  assert(
    Array.isArray(aliceNotifs2) && aliceNotifs2.some((n) => n.message.includes("status changed")),
    "Alice received status-change notifications"
  );
  log("Alice's notifications (after status changes)", aliceNotifs2);

  // ── 15. Mark a notification as read ──────────────────────
  console.log("\n[15] Mark Alice's first notification as read");
  const firstNotif = aliceNotifs[0];
  const { status: s15, data: readNotif } = await request<{ read: boolean }>(
    "PUT", `/notifications/${firstNotif.id}/read`
  );
  assert(s15 === 200, "Mark as read → 200");
  assert((readNotif as { read: boolean }).read === true, "Notification marked as read");
  log("Notification marked read", readNotif);

  // ── 16. Add comments ─────────────────────────────────────
  console.log("\n[16] Add comments to Task B");

  // Move Task B to in-progress first
  await request("PUT", `/tasks/${taskB.id}/status`, { status: "in-progress" });

  const { status: s16, data: comment1 } = await request<{ id: string; body: string }>(
    "POST", "/comments", {
      taskId: taskB.id,
      authorId: alice.id,
      body: "Looking good, Bob!",
    }
  );
  assert(s16 === 201, "Create comment → 201");
  log("Comment 1", comment1);

  const { data: comment2 } = await request<{ id: string; body: string }>(
    "POST", "/comments", {
      taskId: taskB.id,
      authorId: bob.id,
      body: "Thanks Alice!",
    }
  );
  log("Comment 2 (Bob replies)", comment2);

  // ── 17. Check Bob's notifications from comment ───────────
  console.log("\n[17] Check Bob's notifications (comment + status-change)");
  const { status: s17, data: bobNotifs } = await request<Array<{ message: string }>>(
    "GET", `/notifications?userId=${bob.id}`
  );
  assert(s17 === 200, "GET Bob's notifications → 200");
  assert(
    Array.isArray(bobNotifs) && bobNotifs.some((n) => n.message.includes("New comment")),
    "Bob received comment notification"
  );
  log("Bob's notifications", bobNotifs);

  // ── 18. Get comments by task ─────────────────────────────
  console.log("\n[18] Get comments for Task B");
  const { status: s18, data: taskComments } = await request<unknown[]>(
    "GET", `/comments?taskId=${taskB.id}`
  );
  assert(s18 === 200, "GET /comments?taskId → 200");
  assert(Array.isArray(taskComments) && taskComments.length === 2, "Two comments on Task B");
  log("Task B comments", taskComments);

  // ── 19. Get a single comment ─────────────────────────────
  console.log("\n[19] Get single comment");
  const { status: s19, data: singleComment } = await request<{ id: string }>(
    "GET", `/comments/${(comment1 as { id: string }).id}`
  );
  assert(s19 === 200, "GET /comments/:id → 200");
  assert((singleComment as { id: string }).id === (comment1 as { id: string }).id, "Correct comment returned");

  // ── 20. Delete a comment ─────────────────────────────────
  console.log("\n[20] Delete comment 1");
  const { status: s20 } = await request("DELETE", `/comments/${(comment1 as { id: string }).id}`);
  assert(s20 === 204, "DELETE /comments/:id → 204");

  const { data: taskCommentsAfter } = await request<unknown[]>(
    "GET", `/comments?taskId=${taskB.id}`
  );
  assert(
    Array.isArray(taskCommentsAfter) && taskCommentsAfter.length === 1,
    "One comment remains after deletion"
  );

  // ── 21. 404 handling ─────────────────────────────────────
  console.log("\n[21] 404 handling");
  const { status: s21 } = await request("GET", "/users/nonexistent-id");
  assert(s21 === 404, "Non-existent user → 404");

  const { status: s21b } = await request("GET", "/nonexistent-route");
  assert(s21b === 404, "Unknown route → 404");

  // ── 22. Get project by ID ────────────────────────────────
  console.log("\n[22] Get project by ID");
  const { status: s22, data: fetchedProject } = await request<{ id: string }>(
    "GET", `/projects/${project.id}`
  );
  assert(s22 === 200, "GET /projects/:id → 200");
  assert((fetchedProject as { id: string }).id === project.id, "Correct project returned");
  log("Project", fetchedProject);

  // ── 23. Update project ───────────────────────────────────
  console.log("\n[23] Update project description");
  const { status: s23, data: projUpdated } = await request<{ description: string }>(
    "PUT", `/projects/${project.id}`, { description: "Alpha project (updated)" }
  );
  assert(s23 === 200, "PUT /projects/:id → 200");
  assert(
    (projUpdated as { description: string }).description === "Alpha project (updated)",
    "Description updated"
  );

  // ── 24. Delete Task B (after done) ───────────────────────
  console.log("\n[24] Complete and delete Task B");
  await request("PUT", `/tasks/${taskB.id}/status`, { status: "done" });
  const { status: s24 } = await request("DELETE", `/tasks/${taskB.id}`);
  assert(s24 === 204, "DELETE /tasks/:id → 204");

  const { data: remainingTasks } = await request<unknown[]>(
    "GET", `/tasks?projectId=${project.id}`
  );
  assert(
    Array.isArray(remainingTasks) && remainingTasks.length === 1,
    "One task remains after deletion"
  );

  // ── 25. Delete project ───────────────────────────────────
  console.log("\n[25] Delete project");
  const { status: s25 } = await request("DELETE", `/projects/${project.id}`);
  assert(s25 === 204, "DELETE /projects/:id → 204");

  const { data: remainingProjects } = await request<unknown[]>("GET", "/projects");
  assert(
    Array.isArray(remainingProjects) && remainingProjects.length === 0,
    "No projects remain"
  );

  // ── 26. Delete users ─────────────────────────────────────
  console.log("\n[26] Delete users");
  const { status: s26a } = await request("DELETE", `/users/${alice.id}`);
  const { status: s26b } = await request("DELETE", `/users/${bob.id}`);
  const { status: s26c } = await request("DELETE", `/users/${carol.id}`);
  assert(s26a === 204 && s26b === 204 && s26c === 204, "All users deleted");

  const { data: remainingUsers } = await request<unknown[]>("GET", "/users");
  assert(
    Array.isArray(remainingUsers) && remainingUsers.length === 0,
    "No users remain"
  );

  // ── Summary ──────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  Demo complete!");
  console.log("=".repeat(60) + "\n");
}

// Give the server a moment to start before firing requests
setTimeout(async () => {
  try {
    await runDemo();
  } catch (err) {
    console.error("Demo failed with unhandled error:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}, 100);
