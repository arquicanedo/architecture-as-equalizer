import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createRouter } from './router';

const bus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(bus);
const commentService = new CommentService(bus);
const notificationService = new NotificationService(bus);

const server = createRouter({ userService, projectService, taskService, commentService, notificationService });

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// graceful shutdown
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
