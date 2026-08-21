import http from "http";
import { createRouter } from "./router";

function req(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options: any = { method, port: 3000, host: "localhost", path, headers: {} };
    if (data) options.headers["Content-Type"] = "application/json";
    const r = http.request(options, (res: any) => {
      const chunks: any[] = [];
      res.on("data", (c: any) => chunks.push(Buffer.from(c)));
      res.on("end", () => {
        const s = Buffer.concat(chunks).toString();
        if (!s) return resolve(undefined);
        try {
          resolve(JSON.parse(s));
        } catch (e) {
          resolve(s);
        }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function runDemo() {
  const server = createRouter();
  server.listen(3000);
  console.log("Demo server started on 3000");

  // Create users
  const alice = await req("POST", "/users", { name: "Alice", email: "alice@example.com" });
  const bob = await req("POST", "/users", { name: "Bob", email: "bob@example.com" });
  console.log("Users:", alice, bob);

  // Create project
  const project = await req("POST", "/projects", { name: "Demo Project", description: "A demo" });
  console.log("Project:", project);

  // Add members
  await req("POST", `/projects/${project.id}/members`, { userId: alice.id });
  await req("POST", `/projects/${project.id}/members`, { userId: bob.id });

  // Create task
  const task = await req("POST", "/tasks", { title: "Task 1", description: "Do something", projectId: project.id });
  console.log("Task created:", task);

  // Assign task to Bob
  const assigned = await req("PUT", `/tasks/${task.id}/assign`, { assigneeId: bob.id });
  console.log("Assigned:", assigned);

  // Change status to in-progress
  const status1 = await req("PUT", `/tasks/${task.id}/status`, { status: "in-progress" });
  console.log("Status changed:", status1);

  // Add comment by Alice
  const comment = await req("POST", "/comments", { taskId: task.id, authorId: alice.id, body: "Please review" });
  console.log("Comment:", comment);

  // Check Bob's notifications
  const notes = await req("GET", `/notifications?userId=${bob.id}`);
  console.log("Bob notifications:", notes);

  // Mark first as read
  if (notes && notes.length > 0) {
    await req("PUT", `/notifications/${notes[0].id}/read`);
    const notes2 = await req("GET", `/notifications?userId=${bob.id}`);
    console.log("Bob notifications after read:", notes2);
  }

  server.close();
}

if (require.main === module) {
  runDemo().catch((e) => console.error(e));
}
