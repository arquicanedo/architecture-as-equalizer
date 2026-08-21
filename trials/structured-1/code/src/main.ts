/**
 * Entry point — wires all services together and starts the HTTP server.
 *
 * Construction order matters:
 *   1. Create the EventBus singleton.
 *   2. Instantiate services that subscribe to events (NotificationService)
 *      so subscriptions are registered before any events are published.
 *   3. Instantiate services that publish events (TaskService, CommentService).
 *   4. Build the Router with all service instances.
 *   5. Start the HTTP server.
 */

import { createServer } from "http";
import { eventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

// Instantiate services ──────────────────────────────────────────────────────
const userService = new UserService();
const projectService = new ProjectService();

// NotificationService subscribes in its constructor — must be created before
// TaskService / CommentService start publishing.
const notificationService = new NotificationService(eventBus);

const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);

// Wire router ───────────────────────────────────────────────────────────────
const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// Start server ──────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error("[Server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Task Management API listening on http://${HOST}:${PORT}`);
});

export { userService, projectService, taskService, commentService, notificationService };
