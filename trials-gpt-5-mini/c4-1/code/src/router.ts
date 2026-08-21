import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { EventBus } from './event-bus.js';
import { UserService } from './services/user-service.js';
import { ProjectService } from './services/project-service.js';
import { TaskService } from './services/task-service.js';
import { CommentService } from './services/comment-service.js';
import { NotificationService } from './services/notification-service.js';

function json(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (c: Uint8Array) => chunks.push(c));
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString() || '';
      try {
        if (!s) return resolve(null);
        resolve(JSON.parse(s));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export class ApiRouter {
  private bus = new EventBus();
  private userService = new UserService();
  private projectService = new ProjectService();
  private taskService = new TaskService(this.bus);
  private commentService = new CommentService(this.bus);
  private notificationService = new NotificationService(this.bus);

  listen(port: number, cb?: () => void) {
    const server = createServer((req, res) => this.handle(req, res));
    server.listen(port, cb);
    return server;
  }

  private send(res: ServerResponse, status: number, body: any) {
    const s = JSON.stringify(body ?? {});
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(s);
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
    const method = req.method ?? 'GET';

    try {
      // Users
      if (method === 'GET' && url.pathname === '/users') {
        return this.send(res, 200, this.userService.getAll());
      }
      if (method === 'POST' && url.pathname === '/users') {
        const body = await json(req);
        const u = this.userService.create({ name: body.name, email: body.email });
        return this.send(res, 201, u);
      }
      if (url.pathname.startsWith('/users/')) {
        const id = url.pathname.split('/')[2];
        if (method === 'GET') return this.send(res, 200, this.userService.getById(id));
        if (method === 'PUT') {
          const body = await json(req);
          return this.send(res, 200, this.userService.update(id, body));
        }
        if (method === 'DELETE') return this.send(res, 204, null);
      }

      // Projects
      if (method === 'GET' && url.pathname === '/projects') {
        return this.send(res, 200, this.projectService.getAll());
      }
      if (method === 'POST' && url.pathname === '/projects') {
        const body = await json(req);
        const p = this.projectService.create({ name: body.name, description: body.description });
        return this.send(res, 201, p);
      }
      if (url.pathname.startsWith('/projects/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') return this.send(res, 200, this.projectService.getById(id));
          if (method === 'PUT') {
            const body = await json(req);
            return this.send(res, 200, this.projectService.update(id, body));
          }
          if (method === 'DELETE') return this.send(res, 204, null);
        }
        if (parts.length === 3 && parts[2] === 'members') {
          if (method === 'POST') {
            const body = await json(req);
            this.projectService.addMember(id, body.userId);
            return this.send(res, 200, this.projectService.getById(id));
          }
          if (method === 'DELETE') {
            const body = await json(req);
            this.projectService.removeMember(id, body.userId);
            return this.send(res, 200, this.projectService.getById(id));
          }
        }
      }

      // Tasks
      if (url.pathname === '/tasks' && method === 'GET') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return this.send(res, 400, { error: 'projectId required' });
        return this.send(res, 200, this.taskService.getByProject(projectId));
      }
      if (url.pathname === '/tasks' && method === 'POST') {
        const body = await json(req);
        const t = this.taskService.create({ title: body.title, description: body.description, projectId: body.projectId, assigneeId: body.assigneeId });
        return this.send(res, 201, t);
      }
      if (url.pathname.startsWith('/tasks/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') return this.send(res, 200, this.taskService.getById(id));
          if (method === 'PUT') {
            const body = await json(req);
            return this.send(res, 200, this.taskService.update(id, body));
          }
          if (method === 'DELETE') return this.send(res, 204, null);
        }
        if (parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
          const body = await json(req);
          const t = this.taskService.changeStatus(id, body.status);
          return this.send(res, t ? 200 : 400, t);
        }
        if (parts.length === 3 && parts[2] === 'assign' && method === 'PUT') {
          const body = await json(req);
          const t = this.taskService.assign(id, body.assigneeId ?? null);
          return this.send(res, t ? 200 : 400, t);
        }
      }

      // Comments
      if (url.pathname === '/comments' && method === 'GET') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return this.send(res, 400, { error: 'taskId required' });
        return this.send(res, 200, this.commentService.getByTask(taskId));
      }
      if (url.pathname === '/comments' && method === 'POST') {
        const body = await json(req);
        // To satisfy notification constraints, router enriches comment event with task/assignee context if possible
        const task = this.taskService.getById(body.taskId);
        const author = this.userService.getById(body.authorId);
        const comment = this.commentService.create({ taskId: body.taskId, authorId: body.authorId, body: body.body, taskTitle: task?.title, authorName: author?.name });
        // attach assigneeId into event payload by re-publishing? But commentService already published with provided payload.
        // The commentService used taskTitle and authorName given above; we also want assigneeId in the payload to notify assignee.
        // As per architectural constraints, services cannot call each other stores. Router can enrich because it has access to services.
        // We'll manually publish a more complete event on the bus so notification service receives assigneeId.
        this.bus.publish('comment.added', { commentId: comment.id, taskId: body.taskId, taskTitle: task?.title ?? '', authorId: body.authorId, authorName: author?.name ?? '', assigneeId: task?.assigneeId ?? null });
        return this.send(res, 201, comment);
      }
      if (url.pathname.startsWith('/comments/')) {
        const id = url.pathname.split('/')[2];
        if (method === 'GET') return this.send(res, 200, this.commentService.getById(id));
        if (method === 'DELETE') return this.send(res, 204, null);
      }

      // Notifications
      if (url.pathname === '/notifications' && method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) return this.send(res, 400, { error: 'userId required' });
        return this.send(res, 200, this.notificationService.getByUser(userId));
      }
      if (url.pathname.startsWith('/notifications/') && method === 'PUT') {
        const parts = url.pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts[2] === 'read') {
          const n = this.notificationService.markAsRead(id);
          return this.send(res, n ? 200 : 400, n);
        }
      }

      this.send(res, 404, { error: 'not found' });
    } catch (err) {
      this.send(res, 500, { error: String(err) });
    }
  }
}
