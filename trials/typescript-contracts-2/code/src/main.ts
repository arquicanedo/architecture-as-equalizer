import { createServer } from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export function createApp() {
  // ── Event Bus ──────────────────────────────────────────────────
  const eventBus = new EventBus();

  // ── Services ───────────────────────────────────────────────────
  const userService = new UserService();
  const projectService = new ProjectService();

  const taskService = new TaskService(eventBus);

  const commentService = new CommentService(
    eventBus,
    // resolveAuthorName: look up the user name without importing UserService directly
    (authorId: string) => {
      try {
        return userService.getById(authorId).name;
      } catch {
        return "Unknown";
      }
    },
    // resolveTaskTitle: look up the task title without importing TaskService directly
    (taskId: string) => {
      try {
        return taskService.getById(taskId).title;
      } catch {
        return "Unknown Task";
      }
    }
  );

  const notificationService = new NotificationService(
    eventBus,
    // resolveTaskAssigneeId: look up the task assignee without importing TaskService directly
    (taskId: string) => {
      try {
        return taskService.getById(taskId).assigneeId;
      } catch {
        return null;
      }
    }
  );

  // ── Router ─────────────────────────────────────────────────────
  const router = new Router(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // ── HTTP Server ────────────────────────────────────────────────
  const server = createServer((req, res) => {
    router.handle(req, res).catch((err) => {
      console.error("[Server] Unhandled error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    });
  });

  return { server, userService, projectService, taskService, commentService, notificationService };
}

// Only start listening when this is the main module
// (i.e. not imported by demo.ts for its service handles)
if (process.argv[1] && process.argv[1].includes("main")) {
  const { server } = createApp();
  server.listen(PORT, () => {
    console.log(`Task Management API running on http://localhost:${PORT}`);
  });
}
