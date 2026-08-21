import * as http from 'node:http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { Router } from './router';
import { IUserService, ITaskService } from './types';

const PORT = 3000;

async function main() {
  // Initialize Event Bus
  const eventBus = new EventBus();

  // Initialize Services
  const userService = new UserService();
  const projectService = new ProjectService();
  // TaskService depends on EventBus
  const taskService = new TaskService(eventBus);
  // CommentService depends on EventBus and a minimal ITaskService (for getById)
  const commentService = new CommentService(eventBus, taskService as ITaskService);
  // NotificationService depends on IUserService and a minimal ITaskService (for getById)
  const notificationService = new NotificationService(userService as IUserService, taskService as ITaskService);

  // Wire up Event Subscriptions for NotificationService
  eventBus.subscribe('task.assigned', notificationService.handleTaskAssigned);
  eventBus.subscribe('task.statusChanged', notificationService.handleTaskStatusChanged);
  eventBus.subscribe('comment.added', notificationService.handleCommentAdded);

  // Initialize Router with all services
  const router = new Router({
    userService,
    projectService,
    taskService,
    commentService,
    notificationService,
  });

  // Create HTTP server
  const server = http.createServer((req, res) => {
    router.handleRequest(req, res);
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Handle server shutdown gracefully
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

main().catch(console.error);
