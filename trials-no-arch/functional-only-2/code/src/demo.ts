/**
 * Demo script — exercises every feature of the Task Management API.
 *
 * Run:  npx tsx src/demo.ts
 */

import { startServer } from "./server";
import { request, RequestOptions } from "http";

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function api<T = unknown>(
  method: string,
  path: string,
  payload?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const bodyStr = payload !== undefined ? JSON.stringify(payload) : undefined;
    const options: RequestOptions = {
      hostname: "localhost",
      port: PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          resolve({ status: res.statusCode ?? 0, body: parsed as T });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Pretty printer ────────────────────────────────────────────────────────────

let stepNum = 0;
function step(title: string): void {
  stepNum++;
  console.log(`\n${"─".repeat(70)}`);
  console.log(`Step ${stepNum}: ${title}`);
  console.log("─".repeat(70));
}

function show(label: string, res: ApiResponse): void {
  const ok = res.status >= 200 && res.status < 300;
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${res.status}] ${label}`);
  console.log(JSON.stringify(res.body, null, 2));
}

// ── Main demo ─────────────────────────────────────────────────────────────────

async function demo(): Promise<void> {
  console.log("═".repeat(70));
  console.log("  Task Management API — End-to-End Demo");
  console.log("═".repeat(70));

  // ── 1. Create Users ───────────────────────────────────────────────────────
  step("Create three users");
  const u1 = await api("POST", "/users", { name: "Alice",   email: "alice@example.com" });
  const u2 = await api("POST", "/users", { name: "Bob",     email: "bob@example.com"   });
  const u3 = await api("POST", "/users", { name: "Charlie", email: "charlie@example.com" });
  show("Create user Alice",   u1);
  show("Create user Bob",     u2);
  show("Create user Charlie", u3);

  const alice   = (u1.body as { id: string });
  const bob     = (u2.body as { id: string });
  const charlie = (u3.body as { id: string });

  // ── 2. Duplicate email rejection ──────────────────────────────────────────
  step("Attempt duplicate email (should fail 409)");
  const dupUser = await api("POST", "/users", { name: "Alice2", email: "alice@example.com" });
  show("Duplicate email attempt", dupUser);

  // ── 3. List Users ─────────────────────────────────────────────────────────
  step("List all users");
  show("GET /users", await api("GET", "/users"));

  // ── 4. Update a User ─────────────────────────────────────────────────────
  step("Update Alice's name");
  show("PUT /users/:id", await api("PUT", `/users/${alice.id}`, { name: "Alice A." }));

  // ── 5. Get a single User ─────────────────────────────────────────────────
  step("Get Alice by ID");
  show("GET /users/:id", await api("GET", `/users/${alice.id}`));

  // ── 6. Create a Project ───────────────────────────────────────────────────
  step("Create a project");
  const p1 = await api("POST", "/projects", {
    name: "Website Redesign",
    description: "Redesign the company website",
  });
  show("Create project", p1);
  const project = (p1.body as { id: string });

  // ── 7. List Projects ──────────────────────────────────────────────────────
  step("List all projects");
  show("GET /projects", await api("GET", "/projects"));

  // ── 8. Update a Project ───────────────────────────────────────────────────
  step("Update project description");
  show(
    "PUT /projects/:id",
    await api("PUT", `/projects/${project.id}`, {
      description: "Complete overhaul of the company website",
    })
  );

  // ── 9. Add Members ────────────────────────────────────────────────────────
  step("Add Alice, Bob, and Charlie as project members");
  show("Add Alice",   await api("POST", `/projects/${project.id}/members`, { userId: alice.id   }));
  show("Add Bob",     await api("POST", `/projects/${project.id}/members`, { userId: bob.id     }));
  show("Add Charlie", await api("POST", `/projects/${project.id}/members`, { userId: charlie.id }));

  // ── 10. Duplicate member rejection ────────────────────────────────────────
  step("Attempt to add Alice again (should fail 409)");
  show("Duplicate member", await api("POST", `/projects/${project.id}/members`, { userId: alice.id }));

  // ── 11. Remove a Member ───────────────────────────────────────────────────
  step("Remove Charlie from project, then re-add");
  show("Remove Charlie", await api("DELETE", `/projects/${project.id}/members`, { userId: charlie.id }));
  show("Re-add Charlie", await api("POST",   `/projects/${project.id}/members`, { userId: charlie.id }));

  // ── 12. Create Tasks ──────────────────────────────────────────────────────
  step("Create tasks in the project");
  const t1 = await api("POST", "/tasks", {
    title: "Design mockups",
    description: "Create Figma mockups for all pages",
    projectId: project.id,
  });
  const t2 = await api("POST", "/tasks", {
    title: "Set up CI/CD",
    description: "Configure GitHub Actions",
    projectId: project.id,
    assigneeId: bob.id,   // immediate assignment triggers notification
  });
  const t3 = await api("POST", "/tasks", {
    title: "Write unit tests",
    description: "Achieve 80 % coverage",
    projectId: project.id,
  });
  show("Task 1 – Design mockups", t1);
  show("Task 2 – Set up CI/CD (assigned to Bob)", t2);
  show("Task 3 – Write unit tests", t3);

  const task1 = (t1.body as { id: string });
  const task2 = (t2.body as { id: string });
  const task3 = (t3.body as { id: string });

  // ── 13. List Tasks (all + filtered) ──────────────────────────────────────
  step("List tasks");
  show("GET /tasks",                        await api("GET", "/tasks"));
  show("GET /tasks?projectId=<id>",         await api("GET", `/tasks?projectId=${project.id}`));

  // ── 14. Update a Task ────────────────────────────────────────────────────
  step("Update task 1 title");
  show("PUT /tasks/:id", await api("PUT", `/tasks/${task1.id}`, { title: "Design mockups v2" }));

  // ── 15. Assign tasks ─────────────────────────────────────────────────────
  step("Assign task 1 to Alice (triggers notification)");
  show("PUT /tasks/:id/assign", await api("PUT", `/tasks/${task1.id}/assign`, { assigneeId: alice.id }));

  step("Assign task 3 to Charlie (triggers notification)");
  show("PUT /tasks/:id/assign", await api("PUT", `/tasks/${task3.id}/assign`, { assigneeId: charlie.id }));

  // ── 16. Status transitions ────────────────────────────────────────────────
  step("Transition task statuses (valid transitions)");
  show(
    "task1: todo → in-progress",
    await api("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" })
  );
  show(
    "task1: in-progress → done",
    await api("PUT", `/tasks/${task1.id}/status`, { status: "done" })
  );
  show(
    "task2: todo → in-progress",
    await api("PUT", `/tasks/${task2.id}/status`, { status: "in-progress" })
  );

  step("Invalid status transitions (should fail 422)");
  show(
    "task2: in-progress → todo (invalid)",
    await api("PUT", `/tasks/${task2.id}/status`, { status: "todo" })
  );
  show(
    "task1: done → in-progress (invalid, done is terminal)",
    await api("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" })
  );

  // ── 17. Get single Task ───────────────────────────────────────────────────
  step("Get task 2 by ID");
  show("GET /tasks/:id", await api("GET", `/tasks/${task2.id}`));

  // ── 18. Add Comments ─────────────────────────────────────────────────────
  step("Add comments to tasks");
  const c1 = await api("POST", "/comments", {
    taskId:   task1.id,
    authorId: alice.id,
    body:     "Mockups are complete, ready for review!",
  });
  const c2 = await api("POST", "/comments", {
    taskId:   task2.id,
    authorId: alice.id,
    body:     "Please add deployment to staging as well.",
  });
  const c3 = await api("POST", "/comments", {
    taskId:   task2.id,
    authorId: bob.id,
    body:     "Done — staging deploy is included.",
  });
  show("Comment 1 on task1 by Alice", c1);
  show("Comment 2 on task2 by Alice", c2);
  show("Comment 3 on task2 by Bob",   c3);

  const comment1 = (c1.body as { id: string });
  const comment2 = (c2.body as { id: string });

  // ── 19. List & filter Comments ────────────────────────────────────────────
  step("List comments");
  show("GET /comments",                    await api("GET", "/comments"));
  show("GET /comments?taskId=<task2.id>",  await api("GET", `/comments?taskId=${task2.id}`));

  // ── 20. Get single Comment ────────────────────────────────────────────────
  step("Get comment 1 by ID");
  show("GET /comments/:id", await api("GET", `/comments/${comment1.id}`));

  // ── 21. Delete a Comment ──────────────────────────────────────────────────
  step("Delete comment 2");
  show("DELETE /comments/:id", await api("DELETE", `/comments/${comment2.id}`));
  show("GET /comments (after delete)", await api("GET", "/comments"));

  // ── 22. List Notifications (all) ─────────────────────────────────────────
  step("List all notifications generated so far");
  const allNotifs = await api("GET", "/notifications");
  show("GET /notifications", allNotifs);

  // ── 23. Filter Notifications by user ─────────────────────────────────────
  step("Filter notifications for Bob");
  const bobNotifs = await api<Array<{ id: string; message: string; read: boolean }>>(
    "GET",
    `/notifications?userId=${bob.id}`
  );
  show("GET /notifications?userId=<bob>", bobNotifs);

  step("Filter notifications for Alice");
  show("GET /notifications?userId=<alice>", await api("GET", `/notifications?userId=${alice.id}`));

  step("Filter notifications for Charlie");
  show("GET /notifications?userId=<charlie>", await api("GET", `/notifications?userId=${charlie.id}`));

  // ── 24. Mark Notifications as Read ───────────────────────────────────────
  step("Mark Bob's first notification as read");
  const bobNotifsArr = bobNotifs.body;
  if (Array.isArray(bobNotifsArr) && bobNotifsArr.length > 0) {
    const firstId = bobNotifsArr[0].id;
    show(
      `PUT /notifications/${firstId}/read`,
      await api("PUT", `/notifications/${firstId}/read`)
    );
    // Verify it is now read
    show("Bob's notifications after mark-read", await api("GET", `/notifications?userId=${bob.id}`));
  } else {
    console.log("⚠️  No notifications found for Bob — skipping mark-read step");
  }

  // ── 25. Not-found / error cases ───────────────────────────────────────────
  step("Error cases — 404s and bad input");
  show("GET /users/<bogus-id>",            await api("GET",    "/users/nonexistent-id"));
  show("GET /tasks/<bogus-id>",            await api("GET",    "/tasks/nonexistent-id"));
  show("POST /tasks missing projectId",    await api("POST",   "/tasks", { title: "Oops" }));
  show("POST /users missing email",        await api("POST",   "/users", { name: "Ghost" }));
  show("DELETE /notifications/:id/read (wrong route)", await api("GET", "/notifications/bad-id/read"));

  // ── 26. Unassign a task ───────────────────────────────────────────────────
  step("Unassign task 3 (set assigneeId to null)");
  show(
    "PUT /tasks/:id/assign { assigneeId: null }",
    await api("PUT", `/tasks/${task3.id}/assign`, { assigneeId: null })
  );

  // ── 27. Delete a User ─────────────────────────────────────────────────────
  step("Delete Charlie");
  show("DELETE /users/:id", await api("DELETE", `/users/${charlie.id}`));
  show("GET /users (after delete)", await api("GET", "/users"));

  // ── 28. Delete a Task ─────────────────────────────────────────────────────
  step("Delete task 3");
  show("DELETE /tasks/:id", await api("DELETE", `/tasks/${task3.id}`));
  show("GET /tasks (after delete)", await api("GET", "/tasks"));

  // ── 29. Delete a Project (cascades tasks & comments) ─────────────────────
  step("Create a throw-away project and delete it (cascade demo)");
  const tmpP = await api<{ id: string }>("POST", "/projects", { name: "Temp", description: "" });
  const tmpT = await api<{ id: string }>("POST", "/tasks", { title: "Temp task", projectId: (tmpP.body as { id: string }).id });
  await api("POST", "/comments", { taskId: (tmpT.body as { id: string }).id, authorId: alice.id, body: "Temp comment" });
  show("Tasks before project delete", await api("GET", "/tasks"));
  show("Comments before project delete", await api("GET", "/comments"));
  show("DELETE /projects/:id", await api("DELETE", `/projects/${(tmpP.body as { id: string }).id}`));
  show("Tasks after project delete (cascaded)", await api("GET", "/tasks"));
  show("Comments after project delete (cascaded)", await api("GET", "/comments"));

  // ── 30. Final state ───────────────────────────────────────────────────────
  step("Final system state");
  show("Users",         await api("GET", "/users"));
  show("Projects",      await api("GET", "/projects"));
  show("Tasks",         await api("GET", "/tasks"));
  show("Comments",      await api("GET", "/comments"));
  show("Notifications", await api("GET", "/notifications"));

  console.log("\n" + "═".repeat(70));
  console.log("  Demo complete!");
  console.log("═".repeat(70) + "\n");
  process.exit(0);
}

// Start server then run demo after a short delay to let it bind
startServer(PORT);
setTimeout(demo, 200);
