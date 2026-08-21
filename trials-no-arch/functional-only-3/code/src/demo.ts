/**
 * Demo script — exercises all Task Management API features end-to-end.
 * Starts the server on port 3001 and fires HTTP requests, printing results.
 */

import { startServer } from "./server.js";
import { request as httpRequest } from "http";

const PORT = 3001;
const BASE = `http://localhost:${PORT}`;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

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
    const url = new URL(path, BASE);

    const req = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          try {
            resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) as T });
          } catch {
            resolve({ status: res.statusCode ?? 0, body: raw as unknown as T });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Logging helpers ──────────────────────────────────────────────────────────

function section(title: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

function log(label: string, res: ApiResponse): void {
  const ok = res.status >= 200 && res.status < 300;
  const icon = ok ? "✅" : "❌";
  console.log(`\n${icon} [${res.status}] ${label}`);
  console.log(JSON.stringify(res.body, null, 2));
}

// ─── Main demo ────────────────────────────────────────────────────────────────

async function demo(): Promise<void> {
  await startServer(PORT);

  // ── Users ──────────────────────────────────────────────────────────────────
  section("1. Users");

  const aliceRes = await request("POST", "/users", { name: "Alice", email: "alice@example.com" });
  log("Create user Alice", aliceRes);
  const alice = aliceRes.body as { id: string; name: string; email: string };

  const bobRes = await request("POST", "/users", { name: "Bob", email: "bob@example.com" });
  log("Create user Bob", bobRes);
  const bob = bobRes.body as { id: string; name: string; email: string };

  const carolRes = await request("POST", "/users", { name: "Carol", email: "carol@example.com" });
  log("Create user Carol", carolRes);
  const carol = carolRes.body as { id: string; name: string; email: string };

  log("List all users", await request("GET", "/users"));

  log("Get Alice by ID", await request("GET", `/users/${alice.id}`));

  log("Update Alice's name", await request("PUT", `/users/${alice.id}`, { name: "Alice Smith" }));

  // Duplicate email should be rejected
  log(
    "Duplicate email rejected",
    await request("POST", "/users", { name: "Eve", email: "alice@example.com" })
  );

  // ── Projects ───────────────────────────────────────────────────────────────
  section("2. Projects");

  const projRes = await request("POST", "/projects", {
    name: "Website Redesign",
    description: "Full redesign of the company website",
  });
  log("Create project", projRes);
  const project = projRes.body as { id: string; name: string; memberIds: string[] };

  log("List projects", await request("GET", "/projects"));

  log("Add Alice as member", await request("POST", `/projects/${project.id}/members`, { userId: alice.id }));
  log("Add Bob as member", await request("POST", `/projects/${project.id}/members`, { userId: bob.id }));
  log("Add Carol as member", await request("POST", `/projects/${project.id}/members`, { userId: carol.id }));

  // Duplicate member should be rejected
  log("Duplicate member rejected", await request("POST", `/projects/${project.id}/members`, { userId: alice.id }));

  log("Get project (with members)", await request("GET", `/projects/${project.id}`));

  log("Update project description", await request("PUT", `/projects/${project.id}`, { description: "Full redesign + SEO improvements" }));

  log("Remove Carol from project", await request("DELETE", `/projects/${project.id}/members`, { userId: carol.id }));

  log("Get project after member removal", await request("GET", `/projects/${project.id}`));

  // ── Tasks ──────────────────────────────────────────────────────────────────
  section("3. Tasks");

  const task1Res = await request("POST", "/tasks", {
    title: "Design mockups",
    description: "Create Figma mockups for all pages",
    projectId: project.id,
    assigneeId: alice.id,
  });
  log("Create task 1 (assigned to Alice)", task1Res);
  const task1 = task1Res.body as { id: string; title: string; status: string };

  const task2Res = await request("POST", "/tasks", {
    title: "Set up CI/CD",
    description: "Configure GitHub Actions pipeline",
    projectId: project.id,
  });
  log("Create task 2 (unassigned)", task2Res);
  const task2 = task2Res.body as { id: string; title: string; status: string };

  const task3Res = await request("POST", "/tasks", {
    title: "Write unit tests",
    description: "Achieve 80% code coverage",
    projectId: project.id,
    assigneeId: bob.id,
  });
  log("Create task 3 (assigned to Bob)", task3Res);
  const task3 = task3Res.body as { id: string; title: string; status: string };

  log("List all tasks", await request("GET", "/tasks"));
  log(`Filter tasks by project`, await request("GET", `/tasks?projectId=${project.id}`));

  log("Get task 1", await request("GET", `/tasks/${task1.id}`));

  log("Update task 1 title", await request("PUT", `/tasks/${task1.id}`, { title: "Design Figma mockups" }));

  // ── Task status transitions ────────────────────────────────────────────────
  section("4. Task Status Transitions");

  log(
    "Move task 1: todo → in-progress",
    await request("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" })
  );

  // Invalid transition: todo → done should be rejected
  log(
    "Invalid transition todo → done (rejected)",
    await request("PUT", `/tasks/${task2.id}/status`, { status: "done" })
  );

  log(
    "Move task 1: in-progress → done",
    await request("PUT", `/tasks/${task1.id}/status`, { status: "done" })
  );

  // Transition from done should be rejected
  log(
    "Transition from done rejected",
    await request("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" })
  );

  log(
    "Move task 2: todo → in-progress",
    await request("PUT", `/tasks/${task2.id}/status`, { status: "in-progress" })
  );

  // ── Task assignment ────────────────────────────────────────────────────────
  section("5. Task Assignment");

  log(
    "Assign task 2 to Carol",
    await request("PUT", `/tasks/${task2.id}/assign`, { userId: carol.id })
  );

  log(
    "Unassign task 2",
    await request("PUT", `/tasks/${task2.id}/assign`, { userId: null })
  );

  log(
    "Re-assign task 2 to Bob",
    await request("PUT", `/tasks/${task2.id}/assign`, { userId: bob.id })
  );

  // ── Comments ───────────────────────────────────────────────────────────────
  section("6. Comments");

  const comment1Res = await request("POST", "/comments", {
    taskId: task1.id,
    authorId: alice.id,
    body: "Mockups are ready for review, please check the Figma link.",
  });
  log("Alice comments on task 1", comment1Res);
  const comment1 = comment1Res.body as { id: string };

  const comment2Res = await request("POST", "/comments", {
    taskId: task1.id,
    authorId: bob.id,
    body: "Looks great! I have a few minor suggestions.",
  });
  log("Bob comments on task 1", comment2Res);
  const comment2 = comment2Res.body as { id: string };

  const comment3Res = await request("POST", "/comments", {
    taskId: task3.id,
    authorId: bob.id,
    body: "Starting on the unit tests now.",
  });
  log("Bob comments on task 3", comment3Res);

  log("List all comments", await request("GET", "/comments"));
  log(`Filter comments by task 1`, await request("GET", `/comments?taskId=${task1.id}`));
  log("Get comment 1", await request("GET", `/comments/${comment1.id}`));

  log("Delete comment 2", await request("DELETE", `/comments/${comment2.id}`));
  log("Comments on task 1 after deletion", await request("GET", `/comments?taskId=${task1.id}`));

  // ── Notifications ──────────────────────────────────────────────────────────
  section("7. Notifications");

  log("All notifications", await request("GET", "/notifications"));

  log(`Alice's notifications`, await request("GET", `/notifications?userId=${alice.id}`));
  log(`Bob's notifications`, await request("GET", `/notifications?userId=${bob.id}`));

  // Mark a notification as read
  const allNotifs = (await request("GET", `/notifications?userId=${alice.id}`)).body as Array<{
    id: string;
    message: string;
    read: boolean;
  }>;

  if (allNotifs.length > 0) {
    const firstNotif = allNotifs[0];
    log(
      `Mark Alice's notification as read: "${firstNotif.message}"`,
      await request("PUT", `/notifications/${firstNotif.id}/read`)
    );

    log(
      "Alice's notifications after marking first as read",
      await request("GET", `/notifications?userId=${alice.id}`)
    );
  }

  // ── Error cases ────────────────────────────────────────────────────────────
  section("8. Error Cases");

  log("Get non-existent user", await request("GET", "/users/non-existent-id"));
  log("Get non-existent task", await request("GET", "/tasks/non-existent-id"));
  log("Create task with invalid projectId", await request("POST", "/tasks", { title: "T", description: "D", projectId: "bad-id" }));
  log("Route not found", await request("GET", "/unknown-route"));

  // ── Cleanup ────────────────────────────────────────────────────────────────
  section("9. Cleanup (Delete)");

  log("Delete task 3", await request("DELETE", `/tasks/${task3.id}`));
  log("Delete project", await request("DELETE", `/projects/${project.id}`));
  log("Delete user Bob", await request("DELETE", `/users/${bob.id}`));

  console.log(`\n${"═".repeat(60)}`);
  console.log("  Demo complete! ✅");
  console.log("═".repeat(60));

  process.exit(0);
}

demo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
