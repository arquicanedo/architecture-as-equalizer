import http from "http";
import { Router } from "./router";

async function request(method: string, path: string, body?: any) {
  const opts = { hostname: "localhost", port: 4000, path, method, headers: { "Content-Type": "application/json" } } as any;
  return new Promise<any>((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.from(c)));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          if (chunks.length === 0) return resolve(null);
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { resolve(null); }
        } else {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({ status: res.statusCode }); }
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function demo() {
  const router = new Router();
  await router.listen(4000);
  console.log("Demo server started on 4000");

  // create users
  const alice = await request("POST", "/users", { name: "Alice", email: "alice@example.com" });
  const bob = await request("POST", "/users", { name: "Bob", email: "bob@example.com" });
  console.log("Created users", alice, bob);

  // create project
  const project = await request("POST", "/projects", { name: "Project X", description: "Top secret" });
  console.log("Created project", project);

  // add members
  await request("POST", `/projects/${project.id}/members`, { userId: alice.id });
  await request("POST", `/projects/${project.id}/members`, { userId: bob.id });
  console.log("Added members to project");

  // create task
  const task = await request("POST", "/tasks", { title: "Task 1", description: "Do something", projectId: project.id });
  console.log("Created task", task);

  // assign to Bob
  await request("PUT", `/tasks/${task.id}/assign`, { assigneeId: bob.id });
  console.log("Assigned task to Bob");

  // change status todo -> in-progress
  await request("PUT", `/tasks/${task.id}/status`, { status: "in-progress" });
  console.log("Changed status to in-progress");

  // add comment by Alice
  await request("POST", `/comments`, { taskId: task.id, authorId: alice.id, body: "Please take a look" });
  console.log("Alice commented");

  // fetch Bob's notifications
  const notes = await request("GET", `/notifications?userId=${bob.id}`);
  console.log("Bob's notifications", notes);

  // mark first as read
  if (notes && notes.length > 0) {
    await request("PUT", `/notifications/${notes[0].id}/read`);
    console.log("Marked first notification as read");
  }

  // shutdown
  router.close();
}

if (require.main === module) {
  demo().catch((e) => console.error(e));
}
