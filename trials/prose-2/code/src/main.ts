import { createServer } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./user-service";
import { ProjectService } from "./project-service";
import { TaskService } from "./task-service";
import { CommentService } from "./comment-service";
import { NotificationService } from "./notification-service";
import { Router } from "./router";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/**
 * Wire up all services and start the HTTP server.
 *
 * Dependency order:
 *   1. EventBus  — no dependencies
 *   2. Services  — depend on EventBus
 *   3. Router    — depends on all services
 *   4. HTTP server — delegates to Router
 */
function bootstrap() {
  // 1. Event Bus
  const eventBus = new EventBus();

  // 2. Services
  const userService = new UserService();
  const projectService = new ProjectService(eventBus);
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  // NotificationService registers its subscriptions in the constructor
  const notificationService = new NotificationService(eventBus);

  // 3. Router
  const router = new Router(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // 4. HTTP Server
  const server = createServer((req, res) => {
    router.handle(req, res).catch((err: unknown) => {
      console.error("Unhandled error in router:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Task Management API listening on http://localhost:${PORT}`);
    console.log("Available routes:");
    console.log("  Users        : GET/POST /users, GET/PUT/DELETE /users/:id");
    console.log(
      "  Projects     : GET/POST /projects, GET/PUT/DELETE /projects/:id"
    );
    console.log("  Members      : POST/DELETE /projects/:id/members");
    console.log(
      "  Tasks        : GET/POST /tasks, GET/PUT/DELETE /tasks/:id"
    );
    console.log(
      "  Task actions : PUT /tasks/:id/status, PUT /tasks/:id/assign"
    );
    console.log("  Comments     : GET/POST /comments, GET/DELETE /comments/:id");
    console.log("  Notifications: GET /notifications, PUT /notifications/:id/read");
  });

  return server;
}

bootstrap();
