import http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createApiRouter } from './api-router';

// Wire services and event bus
const bus = new EventBus();
const users = new UserService();
const projects = new ProjectService();
const tasks = new TaskService(bus);
const comments = new CommentService(bus);
const notifications = new NotificationService(bus);

// Enrich comment.added.needsAssignee by looking up the task
bus.subscribe('comment.added.needsAssignee', ({ taskId, authorId }: { taskId: string; authorId: string }) => {
  const task = tasks.get(taskId);
  bus.publish('comment.added.enriched', { taskId, assignee: task?.assignee, authorId });
});

const router = createApiRouter({ users, projects, tasks, comments, notifications });

const server = http.createServer((req, res) => router(req, res));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Task Management API listening on http://localhost:${PORT}`);
});

export { server, bus, users, projects, tasks, comments, notifications };
