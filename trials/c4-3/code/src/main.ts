/**
 * Main entry point — wires up all services and starts the HTTP server.
 */

import { createServer } from "http";

import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// 1. Create the shared event bus
const eventBus = new EventBus();

// 2. Instantiate services (event-bus injected where needed)
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus); // subscribes inside constructor

// 3. Create the router with all services
const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// 4. Start the HTTP server
const server = createServer((req, res) => {
  router.handle(req, res).catch((err: unknown) => {
    console.error("[Server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅  Task Management API listening on http://localhost:${PORT}`);
});

export { server, eventBus, userService, projectService, taskService, commentService, notificationService };
