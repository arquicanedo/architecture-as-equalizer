/**
 * Main Entry Point - Wires up all services and starts the HTTP server
 */

import { createServer } from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/**
 * Start the application
 */
async function start() {
  // Create event bus
  const eventBus = new EventBus();

  // Create services
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService(eventBus);

  // Create router
  const router = new Router(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // Create HTTP server
  const server = createServer((req, res) => {
    router.handle(req, res).catch((error) => {
      console.error("Unhandled error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    });
  });

  // Start listening
  server.listen(PORT, () => {
    console.log(`Task Management API server running on http://localhost:${PORT}`);
  });

  return server;
}

// Start the server
start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export { start };
