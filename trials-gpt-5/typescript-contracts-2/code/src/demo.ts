import { createApp } from "./main";
import http from "http";

function request(port: number, method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "localhost",
        port,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            const parsed = raw ? JSON.parse(raw) : {};
            resolve(parsed);
          } catch (e) {
            resolve(raw);
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  const { server } = createApp();
  // Listen on ephemeral port to avoid conflicts
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to determine server port");
  const port = address.port;

  // Create users
  const alice = await request(port, "POST", "/users", { name: "Alice", email: "alice@example.com" });
  const bob = await request(port, "POST", "/users", { name: "Bob", email: "bob@example.com" });

  // Create project
  const proj = await request(port, "POST", "/projects", { name: "Demo Project", description: "A sample project" });

  // Add members
  await request(port, "POST", `/projects/${proj.id}/members`, { userId: alice.id });
  await request(port, "POST", `/projects/${proj.id}/members`, { userId: bob.id });

  // Create task
  const task = await request(port, "POST", "/tasks", { title: "Build API", description: "Implement endpoints", projectId: proj.id });

  // Assign task to Alice
  await request(port, "PUT", `/tasks/${task.id}/assign`, { assigneeId: alice.id });

  // Change status forward only
  await request(port, "PUT", `/tasks/${task.id}/status`, { status: "in-progress" });
  await request(port, "PUT", `/tasks/${task.id}/status`, { status: "done" });

  // Add comments by Bob and Alice
  await request(port, "POST", "/comments", { taskId: task.id, authorId: bob.id, body: "Looks good!" });
  await request(port, "POST", "/comments", { taskId: task.id, authorId: alice.id, body: "Thanks!" });

  // Fetch notifications for Alice
  const aliceNotifs = await request(port, "GET", `/notifications?userId=${alice.id}`);

  console.log("Users:", await request(port, "GET", "/users"));
  console.log("Project:", await request(port, "GET", `/projects/${proj.id}`));
  console.log("Tasks in project:", await request(port, "GET", `/tasks?projectId=${proj.id}`));
  console.log("Comments for task:", await request(port, "GET", `/comments?taskId=${task.id}`));
  console.log("Notifications for Alice:", aliceNotifs);

  // Mark first notification as read if exists
  if (Array.isArray(aliceNotifs) && aliceNotifs.length > 0) {
    const first = aliceNotifs[0];
    const updated = await request(port, "PUT", `/notifications/${first.id}/read`);
    console.log("First notification marked as read:", updated);
  }

  // Shutdown server after demo
  await new Promise((resolve) => server.close(resolve));
}

runDemo().catch((err) => {
  console.error("Demo error:", err);
  process.exit(1);
});
