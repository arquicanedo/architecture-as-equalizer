import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const bus = new EventBus();
const users = new UserService();
const projects = new ProjectService();
const tasks = new TaskService(bus);
const comments = new CommentService(bus);
const notifications = new NotificationService(bus);

const router = new ApiRouter(bus, users, projects, tasks, comments, notifications);

const port = parseInt(process.env.PORT || '3000', 10);
router.start(port).then(() => {
  // eslint-disable-next-line no-console
  console.log(`Task Management API running on http://localhost:${port}`);
});
