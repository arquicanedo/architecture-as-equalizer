import { request as httpRequest } from "node:http";
import { URL } from "node:url";
import { createHttpServer, Router } from "./router";
import { EventBus } from "./event-bus";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { UserService } from "./services/user-service";

function http(method: string, path: string, body?: any): Promise<any> {
  const base = "http://localhost:3001";
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            resolve({});
          }
        });
      },
    );
    req.on("error", reject);
    if (body) {
      const str = JSON.stringify(body);
      req.setHeader("Content-Length", Buffer.byteLength(str));
      req.write(str);
    }
    req.end();
  });
}

async function runDemo() {
  const bus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(bus);
  const commentService = new CommentService(bus);

  const getUserName = (userId: string) => {
    try {
      return userService.getById(userId).name;
    } catch {
      return null;
    }
  };
  const getTaskTitle = (taskId: string) => {
    try {
      return taskService.getById(taskId).title;
    } catch {
      return null;
    }
  };
  const getTaskAssigneeId = (taskId: string) => {
    try {
      return taskService.getById(taskId).assigneeId;
    } catch {
      return null;
    }
  };

  const notificationService = new NotificationService(bus, getUserName, getTaskTitle, getTaskAssigneeId);
  notificationService.wireSubscriptions();

  const router = new Router(userService, projectService, taskService, commentService, notificationService);
  const server = createHttpServer(router);
  const PORT = 3001;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Demo server listening on http://localhost:${PORT}`);

  // Demo flow
  const alice = await http("POST", "/users", { name: "Alice", email: "alice@example.com" });
  const bob = await http("POST", "/users", { name: "Bob", email: "bob@example.com" });
  console.log("Created users:", alice, bob);

  const project = await http("POST", "/projects", { name: "Alpha", description: "First project" });
  await http("POST", `/projects/${project.id}/members`, { userId: alice.id });
  await http("POST", `/projects/${project.id}/members`, { userId: bob.id });
  console.log("Project with members:", await http("GET", `/projects/${project.id}`));

  const task1 = await http("POST", "/tasks", { title: "Design API", description: "Design endpoints", projectId: project.id });
  const task2 = await http("POST", "/tasks", { title: "Implement Service", description: "Write code", projectId: project.id });
  console.log("Created tasks:", task1, task2);

  await http("PUT", `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
  await http("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" });
  await http("PUT", `/tasks/${task1.id}/status`, { status: "done" });

  await http("PUT", `/tasks/${task2.id}/assign`, { assigneeId: bob.id });
  await http("PUT", `/tasks/${task2.id}/status`, { status: "in-progress" });

  await http("POST", "/comments", { taskId: task2.id, authorId: alice.id, body: "Looks good!" });

  // Check notifications
  const aliceNotifs = await http("GET", `/notifications?userId=${alice.id}`);
  const bobNotifs = await http("GET", `/notifications?userId=${bob.id}`);
  console.log("Notifications for Alice:", aliceNotifs);
  console.log("Notifications for Bob:", bobNotifs);

  // Mark first notification for Bob as read
  if (bobNotifs[0]) {
    await http("PUT", `/notifications/${bobNotifs[0].id}/read`);
    console.log("Bob notifications after marking read:", await http("GET", `/notifications?userId=${bob.id}`));
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log("Demo completed.");
}

runDemo().catch((err) => {
  console.error("Demo error:", err);
  process.exit(1);
});
