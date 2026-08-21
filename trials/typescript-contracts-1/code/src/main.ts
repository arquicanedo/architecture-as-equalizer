import { createServer, IncomingMessage, ServerResponse } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { Router } from "./router";

export const DEFAULT_PORT = 3000;

export function buildApp() {
  // ----------------------------------------------------------------
  // 1. Instantiate event bus
  // ----------------------------------------------------------------
  const eventBus = new EventBus();

  // ----------------------------------------------------------------
  // 2. Instantiate services
  //    Resolver functions are injected as closures so services never
  //    import each other directly (enforces RULE 1).
  // ----------------------------------------------------------------
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);

  const commentService = new CommentService(
    eventBus,
    // resolveTaskTitle: returns the task title for a given taskId
    (taskId: string) => {
      try {
        return taskService.getById(taskId).title;
      } catch {
        return "(unknown task)";
      }
    },
    // resolveAuthorName: returns the user name for a given userId
    (authorId: string) => {
      try {
        return userService.getById(authorId).name;
      } catch {
        return "(unknown user)";
      }
    }
  );

  const notificationService = new NotificationService(
    eventBus,
    // resolveTaskAssignee: returns the assigneeId for a given taskId
    (taskId: string) => {
      try {
        return taskService.getById(taskId).assigneeId;
      } catch {
        return null;
      }
    }
  );

  // ----------------------------------------------------------------
  // 3. Build router
  // ----------------------------------------------------------------
  const router = new Router(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // ----------------------------------------------------------------
  // 4. Create HTTP server
  // ----------------------------------------------------------------
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    router.handle(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[Server] Unhandled error:", message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    });
  });

  return {
    server,
    userService,
    projectService,
    taskService,
    commentService,
    notificationService,
  };
}

// Only start listening when this file is run directly (not imported by demo)
if (require.main === module) {
  const { server } = buildApp();
  server.listen(DEFAULT_PORT, () => {
    console.log(`Task Management API running on http://localhost:${DEFAULT_PORT}`);
  });
}
