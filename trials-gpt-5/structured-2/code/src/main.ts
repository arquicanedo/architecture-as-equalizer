import { buildServer } from './router';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

const bus = new EventBus();

const services = {
  users: new UserService(),
  projects: new ProjectService(),
  tasks: new TaskService(bus),
  comments: new CommentService(bus),
  notifications: new NotificationService(bus),
};

const server = buildServer(services);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
