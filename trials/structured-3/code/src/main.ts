/**
 * Entry Point
 * Wires all services together, registers event subscriptions, starts the HTTP server.
 */

import { createServer } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { Router } from "./router";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// 1. Create the event bus (shared communication channel)
const eventBus = new EventBus();

// 2. Instantiate services — each receives the event bus if it needs it
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
// NotificationService registers its event subscriptions in its constructor
const notificationService = new NotificationService(eventBus);

// 3. Wire up the router with all services
const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// 4. Create and start the HTTP server
const server = createServer((req, res) => {
  router.handle(req, res).catch((err: unknown) => {
    const message =
      err instanceof Error ? err.message : "Unexpected server error";
    console.error("[server error]", message);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API listening on http://localhost:${PORT}`);
});

export { server, eventBus, userService, projectService, taskService, commentService, notificationService };
