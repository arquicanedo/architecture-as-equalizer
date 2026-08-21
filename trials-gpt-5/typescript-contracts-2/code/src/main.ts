import http from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { createRouter } from "./router";

export function createApp() {
  const eventBus = new EventBus();

  // Initialize services
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const notificationService = new NotificationService(eventBus, taskService);
  const commentService = new CommentService(eventBus, userService, taskService);

  // Event wiring per spec
  eventBus.subscribe("task.assigned", notificationService.onTaskAssigned);
  eventBus.subscribe("task.statusChanged", notificationService.onTaskStatusChanged);
  eventBus.subscribe("comment.added", notificationService.onCommentAdded);

  const services = {
    users: userService,
    projects: projectService,
    tasks: taskService,
    comments: commentService,
    notifications: notificationService,
  };

  const router = createRouter(services);
  const server = http.createServer(router);

  return { server, services };
}

// Start server if run directly
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const { server } = createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
