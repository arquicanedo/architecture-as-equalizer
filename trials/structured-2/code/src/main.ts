/**
 * Main entry point
 * Wires all services together and starts the HTTP server.
 */

import { createServer } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { createRouter } from "./router";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// 1. Create the event bus (shared communication channel)
const eventBus = new EventBus();

// 2. Instantiate services, injecting the event bus where needed
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
// NotificationService registers its event subscriptions in the constructor
const notificationService = new NotificationService(eventBus);

// 3. Build the HTTP request handler
const handler = createRouter(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// 4. Start the server
const server = createServer(handler);

server.listen(PORT, () => {
  console.log(`Task Management API listening on http://localhost:${PORT}`);
  console.log("Services wired:");
  console.log("  ✓ EventBus");
  console.log("  ✓ UserService");
  console.log("  ✓ ProjectService");
  console.log("  ✓ TaskService");
  console.log("  ✓ CommentService");
  console.log("  ✓ NotificationService");
});

export { server, eventBus, userService, projectService, taskService, commentService, notificationService };
