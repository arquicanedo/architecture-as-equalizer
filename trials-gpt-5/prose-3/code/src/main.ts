import { createServer } from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const bus = new EventBus();

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(bus);
const commentService = new CommentService(bus);
const notificationService = new NotificationService(bus);

const router = new ApiRouter(bus, userService, projectService, taskService, commentService, notificationService);

const server = createServer((req, res) => router.handle(req, res));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`Task Management API running on http://localhost:${PORT}`);
});
