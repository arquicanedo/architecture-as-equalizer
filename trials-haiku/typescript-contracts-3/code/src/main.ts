// ============================================================
// Main Entry Point — Wiring & Server Start
// ============================================================

import { createServer } from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";
import { TaskAssignedPayload, TaskStatusChangedPayload } from "./services/task-service.js";
import { CommentAddedPayload } from "./services/comment-service.js";

// Initialize Event Bus
const eventBus = new EventBus();

// Initialize Services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService();

// Initialize Router
const router = new Router({
  userService,
  projectService,
  taskService,
  commentService,
  notificationService,
});

// ============================================================
// Event Subscriptions
// ============================================================

// Subscribe NotificationService to task.assigned event
eventBus.subscribe("task.assigned", (payload: unknown) => {
  const p = payload as TaskAssignedPayload;
  notificationService.createNotification(
    p.assigneeId,
    `Task '${p.taskTitle}' assigned to you`
  );
});

// Subscribe NotificationService to task.statusChanged event
eventBus.subscribe("task.statusChanged", (payload: unknown) => {
  const p = payload as TaskStatusChangedPayload;
  if (p.assigneeId) {
    notificationService.createNotification(
      p.assigneeId,
      `Task '${p.taskTitle}' status changed to ${p.newStatus}`
    );
  }
});

// Subscribe NotificationService to comment.added event
eventBus.subscribe("comment.added", (payload: unknown) => {
  const p = payload as CommentAddedPayload;
  try {
    const task = taskService.getById(p.taskId);
    if (task.assigneeId && task.assigneeId !== p.authorId) {
      notificationService.createNotification(
        task.assigneeId,
        `${p.authorName} commented on task '${p.taskTitle}'`
      );
    }
  } catch {
    // Task not found, skip notification
  }
});

// ============================================================
// HTTP Server
// ============================================================

const PORT = 3000;

const server = createServer((req, res) => {
  router.handle(req, res).catch((error) => {
    console.error("Router error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API server listening on http://localhost:${PORT}`);
});

export { eventBus, userService, projectService, taskService, commentService, notificationService };
