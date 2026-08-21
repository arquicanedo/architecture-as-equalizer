/**
 * Main entry point — wires all services together and starts the HTTP server.
 */

import { createServer } from "http";
import { eventBus } from "./event-bus";
import { userService } from "./services/user-service";
import { projectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { Router } from "./router";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Instantiate services, injecting the event bus where needed
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus); // registers subscriptions

// Wire the router with all services
const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// Create and start the HTTP server
const server = createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error("[Server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API listening on http://localhost:${PORT}`);
});

export { server, router, userService, projectService, taskService, commentService, notificationService };
