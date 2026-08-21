import { createRouter } from "./router";
import { request as httpRequest } from "http";
import { TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload } from "./types";

function req(method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const opts = { hostname: "localhost", port: 3000, path, method, headers: { "Content-Type": "application/json" } } as any;
    const r = httpRequest(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.from(c)));
      res.on("end", () => {
        const str = Buffer.concat(chunks).toString();
        const parsed = str ? JSON.parse(str) : null;
        resolve({ status: res.statusCode || 0, body: parsed });
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runDemo() {
  const { server, services, eventBus } = createRouter();
  const { userService, projectService, taskService, commentService, notificationService } = services;

  // Wire event handlers (same as main) so demo observes notifications
  eventBus.subscribe("task.assigned", (payload) => {
    const p = payload as TaskAssignedPayload;
    const message = `Task '${p.taskTitle}' assigned to you`;
    notificationService.createNotification(p.assigneeId, message);
  });

  eventBus.subscribe("task.statusChanged", (payload) => {
    const p = payload as TaskStatusChangedPayload;
    const message = `Task '${p.taskTitle}' status changed to ${p.newStatus}`;
    if (p.assigneeId) notificationService.createNotification(p.assigneeId, message);
  });

  eventBus.subscribe("comment.added", (payload) => {
    const p = payload as CommentAddedPayload;
    try {
      const task = taskService.getById(p.taskId);
      const author = userService.getById(p.authorId);
      const message = `New comment on '${task.title}' by ${author.name}`;
      if (task.assigneeId) notificationService.createNotification(task.assigneeId, message);
    } catch (e) {}
  });

  server.listen(3000);
  // create users
  const u1 = await req("POST", "/users", { name: "Alice", email: "alice@example.com" });
  const u2 = await req("POST", "/users", { name: "Bob", email: "bob@example.com" });
  console.log("created users", u1.body, u2.body);

  // create project
  const p = await req("POST", "/projects", { name: "Project X", description: "Secret" });
  console.log("created project", p.body);

  // add members
  await req("POST", `/projects/${p.body.id}/members`, { userId: u1.body.id });
  await req("POST", `/projects/${p.body.id}/members`, { userId: u2.body.id });

  // create task
  const t = await req("POST", "/tasks", { title: "Design", description: "Design the thing", projectId: p.body.id });
  console.log("created task", t.body);

  // assign task
  const assigned = await req("PUT", `/tasks/${t.body.id}/assign`, { assigneeId: u2.body.id });
  console.log("assigned task", assigned.body);

  // change status todo -> in-progress
  const s1 = await req("PUT", `/tasks/${t.body.id}/status`, { status: "in-progress" });
  console.log("status changed", s1.body);

  // add comment
  const c = await req("POST", "/comments", { taskId: t.body.id, authorId: u1.body.id, body: "Please update" });
  console.log("added comment", c.body);

  // fetch notifications for Bob (assignee)
  const notes = await req("GET", `/notifications?userId=${u2.body.id}`);
  console.log("notifications for Bob", notes.body);

  server.close();
}

if (require.main === module) {
  runDemo().catch((err) => console.error(err));
}
