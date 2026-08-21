import * as http from 'node:http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const PORT = 3000;

async function bootstrap() {
  const eventBus = new EventBus();

  // Instantiate services
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  // CommentService requires userService and taskService to create accurate payloads
  const commentService = new CommentService(eventBus, userService, taskService);
  // NotificationService requires userService and taskService for message content and assignee lookup
  const notificationService = new NotificationService(eventBus, userService, taskService);

  // Instantiate router with all services
  const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  const server = http.createServer((req, res) => {
    router.handleRequest(req, res);
  });

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  // Keep server running for demo/testing purposes
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('Server shut down.');
      process.exit(0);
    });
  });

  return { userService, projectService, taskService, commentService, notificationService, server };
}

// Only run bootstrap if this file is executed directly (not imported)
if (require.main === module) {
  bootstrap().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { bootstrap };
