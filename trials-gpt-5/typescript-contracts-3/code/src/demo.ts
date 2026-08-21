import http from "http";
import { startServer } from "./router";
import EventBus from "./event-bus";
import UserService from "./services/user-service";
import ProjectService from "./services/project-service";
import TaskService from "./services/task-service";
import CommentService from "./services/comment-service";
import NotificationService from "./services/notification-service";
import { CommentAddedPayload, IEventBus } from "./types";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function httpRequest(method: string, path: string, body?: any): Promise<any> {
  const data = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path,
        method,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          const text = buf || "{}";
          try {
            const json = JSON.parse(text);
            resolve({ status: res.statusCode, body: json });
          } catch (err) {
            resolve({ status: res.statusCode, body: text });
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
  // Start up a separate instance on 3001 for the demo
  const eventBus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService();

  // Event wiring (same as main.ts)
  eventBus.subscribe("task.assigned", (payload) => notificationService.handleTaskAssigned(payload as any));
  eventBus.subscribe("task.statusChanged", (payload) => notificationService.handleTaskStatusChanged(payload as any));

  const enrich = (payload: CommentAddedPayload): CommentAddedPayload => {
    try {
      const task = taskService.getById(payload.taskId);
      const author = userService.getById(payload.authorId);
      return { ...payload, taskTitle: task.title, authorName: author.name };
    } catch {
      return payload;
    }
  };
  (eventBus as IEventBus).subscribe("comment.added", (raw) => notificationService.handleCommentAdded(enrich(raw as any)));

  const server = startServer(3001, { userService, projectService, taskService, commentService, notificationService });
  console.log("Demo server started on http://localhost:3001");

  // Create users
  const u1 = (await httpRequest("POST", "/users", { name: "Alice", email: "alice@example.com" })).body;
  const u2 = (await httpRequest("POST", "/users", { name: "Bob", email: "bob@example.com" })).body;

  // Create project and add members
  const proj = (await httpRequest("POST", "/projects", { name: "Apollo", description: "Moon mission" })).body;
  await httpRequest("POST", `/projects/${proj.id}/members`, { userId: u1.id });
  await httpRequest("POST", `/projects/${proj.id}/members`, { userId: u2.id });

  // Create task
  const t1 = (await httpRequest("POST", "/tasks", { title: "Design", description: "Design module", projectId: proj.id })).body;

  // Assign task
  await httpRequest("PUT", `/tasks/${t1.id}/assign`, { assigneeId: u1.id });

  // Change status todo -> in-progress -> done
  await httpRequest("PUT", `/tasks/${t1.id}/status`, { status: "in-progress" });
  await httpRequest("PUT", `/tasks/${t1.id}/status`, { status: "done" });

  // Add comment
  await httpRequest("POST", "/comments", { taskId: t1.id, authorId: u2.id, body: "Looks good!" });

  // Give async handlers a moment
  await sleep(100);

  // Fetch notifications for Alice
  const notes = (await httpRequest("GET", `/notifications?userId=${u1.id}`)).body;
  console.log("Notifications for Alice:", notes);

  server.close();
}

runDemo().catch((err) => {
  console.error("Demo error:", err);
  process.exit(1);
});
