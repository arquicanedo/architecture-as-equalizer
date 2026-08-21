import { createServer } from "http";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Instantiate all services
const userSvc = new UserService();
const projectSvc = new ProjectService();
const taskSvc = new TaskService();
const commentSvc = new CommentService();
// NotificationService self-registers event subscriptions in its constructor
const notifSvc = new NotificationService();

// Wire services into the router (single entry point for all HTTP traffic)
const router = new Router(userSvc, projectSvc, taskSvc, commentSvc, notifSvc);

const server = createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error("[Server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API running on http://localhost:${PORT}`);
});

export { server };
