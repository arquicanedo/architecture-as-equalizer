import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createServerWithServices } from './api-router';

const eventBus = new EventBus();
const users = new UserService();
const projects = new ProjectService();
const tasks = new TaskService(eventBus);
const comments = new CommentService(eventBus);
const notifications = new NotificationService(eventBus);

const port = 3000;
const server = createServerWithServices(port, { eventBus, users, projects, tasks, comments, notifications });

server.listen(() => {
  console.log(`Server listening on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down');
  server.close(() => process.exit(0));
});
