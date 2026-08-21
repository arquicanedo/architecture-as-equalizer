/**
 * main.ts — application entry point.
 *
 * Wires all services together, registers event subscriptions (via
 * the NotificationService constructor), attaches the router, and
 * starts the HTTP server.
 *
 * Usage:
 *   npx tsx src/main.ts
 */

import http from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { ApiRouter } from "./router.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ── Composition root ──────────────────────────────────────────────────────────

const eventBus = new EventBus();

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);

// NotificationService wires its own event subscriptions in its constructor
const notificationService = new NotificationService(eventBus);

const router = new ApiRouter(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error("Unhandled router error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
