import http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { Router } from './router';

const bus = new EventBus();
const users = new UserService();
const projects = new ProjectService();
const tasks = new TaskService(bus);
const comments = new CommentService(bus);
const notifications = new NotificationService(bus);

const router = new Router(bus, users, projects, tasks, comments, notifications);

const server = http.createServer((req, res) => router.handle(req, res));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

// export for demo
export { server, bus, users, projects, tasks, comments, notifications };
