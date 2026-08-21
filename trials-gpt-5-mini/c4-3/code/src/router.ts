import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl, UrlWithParsedQuery } from 'url';

import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export class APIRouter {
  private bus = new EventBus();
  private users = new UserService();
  private projects = new ProjectService();
  private tasks = new TaskService(this.bus);
  private comments = new CommentService(this.bus);
  private notifs = new NotificationService(this.bus);

  server = createServer((req: IncomingMessage, res: ServerResponse) => this.handle(req, res));

  listen(port: number, cb?: () => void) {
    this.server.listen(port, cb);
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const parsed = parseUrl(req.url || '', true) as UrlWithParsedQuery;
    const method = req.method || 'GET';
    const path = parsed.pathname || '/';

    // simple body parsing
    const body = await new Promise<any>(resolve => {
      let s = '';
      req.on('data', (chunk: any) => s += chunk);
      req.on('end', () => {
        try { resolve(s ? JSON.parse(s) : null); } catch { resolve(null); }
      });
    });

    // route matching
    try {
      // Users
      if (method === 'GET' && path === '/users') return this.ok(res, this.users.getAll());
      if (method === 'POST' && path === '/users') {
        const u = this.users.create(body || {});
        return this.ok(res, u, 201);
      }
      if (path?.startsWith('/users/')) {
        const id = path.split('/')[2];
        if (method === 'GET') return this.ok(res, this.users.getById(id));
        if (method === 'PUT') return this.ok(res, this.users.update(id, body || {}));
        if (method === 'DELETE') return this.ok(res, { deleted: this.users.delete(id) });
      }

      // Projects
      if (method === 'GET' && path === '/projects') return this.ok(res, this.projects.getAll());
      if (method === 'POST' && path === '/projects') return this.ok(res, this.projects.create(body || {}), 201);
      if (path?.startsWith('/projects/')) {
        const parts = path.split('/');
        const id = parts[2];
        if (parts.length === 3) {
          if (method === 'GET') return this.ok(res, this.projects.getById(id));
          if (method === 'PUT') return this.ok(res, this.projects.update(id, body || {}));
          if (method === 'DELETE') return this.ok(res, { deleted: this.projects.delete(id) });
        }
        if (parts.length === 4 && parts[3] === 'members') {
          if (method === 'POST') return this.ok(res, this.projects.addMember(id, body.userId));
          if (method === 'DELETE') return this.ok(res, this.projects.removeMember(id, body.userId));
        }
      }

      // Tasks
      if (method === 'GET' && path === '/tasks') {
        const projectId = parsed.query.projectId as string | undefined;
        if (projectId) return this.ok(res, this.tasks.getByProject(projectId));
        return this.ok(res, []);
      }
      if (method === 'POST' && path === '/tasks') {
        const t = this.tasks.create(body || {});
        return this.ok(res, t, 201);
      }
      if (path?.startsWith('/tasks/')) {
        const parts = path.split('/');
        const id = parts[2];
        if (parts.length === 3) {
          if (method === 'GET') return this.ok(res, this.tasks.getById(id));
          if (method === 'PUT') return this.ok(res, this.tasks.update(id, body || {}));
          if (method === 'DELETE') return this.ok(res, { deleted: this.tasks.delete(id) });
        }
        if (parts.length === 4 && parts[3] === 'status' && method === 'PUT') {
          const result = this.tasks.changeStatus(id, body.newStatus);
          return this.ok(res, result);
        }
        if (parts.length === 4 && parts[3] === 'assign' && method === 'PUT') {
          const result = this.tasks.assign(id, body.assigneeId ?? null);
          return this.ok(res, result);
        }
      }

      // Comments
      if (method === 'GET' && path === '/comments') {
        const taskId = parsed.query.taskId as string | undefined;
        if (taskId) return this.ok(res, this.comments.getByTask(taskId));
        return this.ok(res, []);
      }
      if (method === 'POST' && path === '/comments') {
        // We may want to include taskTitle and authorName for notification service
        const comment = this.comments.create(body || {});
        return this.ok(res, comment, 201);
      }
      if (path?.startsWith('/comments/')) {
        const id = path.split('/')[2];
        if (method === 'GET') return this.ok(res, this.comments.getById(id));
        if (method === 'DELETE') return this.ok(res, { deleted: this.comments.delete(id) });
      }

      // Notifications
      if (method === 'GET' && path === '/notifications') {
        const userId = parsed.query.userId as string | undefined;
        if (!userId) return this.badRequest(res, 'userId required');
        return this.ok(res, this.notifs.getByUser(userId));
      }
      if (path?.startsWith('/notifications/')) {
        const parts = path.split('/');
        const id = parts[2];
        if (parts.length === 4 && parts[3] === 'read' && method === 'PUT') {
          return this.ok(res, this.notifs.markAsRead(id));
        }
      }

      this.notFound(res);
    } catch (err) {
      console.error(err);
      this.serverError(res);
    }
  }

  private ok(res: ServerResponse, data: any, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
  private badRequest(res: ServerResponse, msg: string) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
  private notFound(res: ServerResponse) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  }
  private serverError(res: ServerResponse) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server error' }));
  }
}
