import { createServer } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { ApiRouter } from "./router";

const PORT = process.env.PORT || 3000;

function main() {
  // 1. Instantiate all components
  const eventBus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  
  // 2. Inject dependencies
  const commentService = new CommentService(eventBus, taskService, userService);
  const notificationService = new NotificationService(eventBus, taskService);

  // 3. Set up event subscriptions
  notificationService.subscribeToEvents();

  // 4. Instantiate the router with all services
  const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // 5. Create and start the HTTP server
  const server = createServer((req, res) => {
    router.handleRequest(req, res);
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
    main();
}
