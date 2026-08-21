import { createServer } from 'http';
import { EventBus } from './event-bus';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { Router } from './router';

const PORT = Number(process.env.PORT ?? 3000);

// ─── Wire everything together ─────────────────────────────────────────────────

const eventBus = new EventBus();

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);

// NotificationService self-registers its event subscriptions in the constructor.
const notificationService = new NotificationService(eventBus);

const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error('[Server] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error.' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Task Management API listening on http://localhost:${PORT}`);
});

export { server, router };
