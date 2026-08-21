import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

function parseUrl(url: string | undefined) {
  if (!url) return { path: '/', query: new URLSearchParams() };
  const u = new URL(url, 'http://localhost');
  return { path: u.pathname, query: u.searchParams };
}

export class Router {
  private server = createServer(this.handler.bind(this));

  private bus = new EventBus();
  public users = new UserService();
  public projects = new ProjectService();
  public tasks = new TaskService(this.bus);
  public comments = new CommentService(this.bus);
  public notifications = new NotificationService(this.bus);

  listen(port: number, cb?: () => void) {
    this.server.listen(port, cb);
  }

  close(cb?: () => void) {
    this.server.close(cb ?? (() => {}));
  }

  private async handler(req: IncomingMessage, res: ServerResponse) {
    try {
      const method = req.method || 'GET';
      const { path, query } = parseUrl(req.url);
      const body = await this.readBody(req);

      // simple router matching
      // Users
      if (method === 'GET' && path === '/users') return this.ok(res, this.users.getAll());
      if (method === 'POST' && path === '/users') {
        const u = this.users.create(body);
        return this.ok(res, u, 201);
      }
      if (path.startsWith('/users/')) {
        const id = path.slice('/users/'.length);
        if (method === 'GET') return this.ok(res, this.users.getById(id));
        if (method === 'PUT') return this.ok(res, this.users.update(id, body));
        if (method === 'DELETE') {
          this.users.delete(id);
          return this.ok(res, { deleted: true });
        }
      }

      // Projects
      if (method === 'GET' && path === '/projects') return this.ok(res, this.projects.getAll());
      if (method === 'POST' && path === '/projects') {
        const p = this.projects.create(body);
        return this.ok(res, p, 201);
      }
      if (path.startsWith('/projects/')) {
        const rest = path.slice('/projects/'.length);
        const parts = rest.split('/');
        const id = parts[0];
        if (parts.length === 1) {
          if (method === 'GET') return this.ok(res, this.projects.getById(id));
          if (method === 'PUT') return this.ok(res, this.projects.update(id, body));
          if (method === 'DELETE') {
            this.projects.delete(id);
            return this.ok(res, { deleted: true });
          }
        }
        if (parts.length === 2 && parts[1] === 'members') {
          if (method === 'POST') return this.ok(res, this.projects.addMember(id, body.userId));
          if (method === 'DELETE') return this.ok(res, this.projects.removeMember(id, body.userId));
        }
      }

      // Tasks
      if (method === 'GET' && path === '/tasks') {
        const projectId = query.get('projectId');
        if (projectId) return this.ok(res, this.tasks.getByProject(projectId));
        return this.ok(res, this.tasks.getAll());
      }
      if (method === 'POST' && path === '/tasks') {
        const t = this.tasks.create(body);
        return this.ok(res, t, 201);
      }
      if (path.startsWith('/tasks/')) {
        const rest = path.slice('/tasks/'.length);
        const parts = rest.split('/');
        const id = parts[0];
        if (parts.length === 1) {
          if (method === 'GET') return this.ok(res, this.tasks.getById(id));
          if (method === 'PUT') return this.ok(res, this.tasks.update(id, body));
          if (method === 'DELETE') {
            this.tasks.delete(id);
            return this.ok(res, { deleted: true });
          }
        }
        if (parts.length === 2 && parts[1] === 'status' && method === 'PUT') {
          return this.ok(res, this.tasks.changeStatus(id, body.status));
        }
        if (parts.length === 2 && parts[1] === 'assign' && method === 'PUT') {
          return this.ok(res, this.tasks.assign(id, body.assigneeId));
        }
      }

      // Comments
      if (method === 'GET' && path === '/comments') {
        const taskId = query.get('taskId');
        if (taskId) return this.ok(res, this.comments.getByTask(taskId));
        return this.ok(res, []);
      }
      if (method === 'POST' && path === '/comments') {
        // enrich meta: find task and author name to include in event
        const { taskId, authorId } = body;
        const task = this.tasks.getById(taskId);
        const user = this.users.getById(authorId);
        const comment = this.comments.create(body, { taskTitle: task?.title, authorName: user?.name, assigneeId: task?.assigneeId });
        return this.ok(res, comment, 201);
      }
      if (path.startsWith('/comments/')) {
        const id = path.slice('/comments/'.length);
        if (method === 'GET') return this.ok(res, this.comments.getById(id));
        if (method === 'DELETE') {
          this.comments.delete(id);
          return this.ok(res, { deleted: true });
        }
      }

      // Notifications
      if (method === 'GET' && path === '/notifications') {
        const userId = query.get('userId');
        if (!userId) return this.ok(res, []);
        return this.ok(res, this.notifications.getByUser(userId));
      }
      if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
        const id = path.slice('/notifications/'.length, -'/read'.length);
        return this.ok(res, this.notifications.markAsRead(id));
      }

      this.notFound(res);
    } catch (err: any) {
      this.error(res, err);
    }
  }

  private readBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(Buffer.from(c)));
      req.on('end', () => {
        if (chunks.length === 0) return resolve({});
        try {
          const s = Buffer.concat(chunks).toString();
          resolve(JSON.parse(s));
        } catch (err) {
          resolve({});
        }
      });
    });
  }

  private ok(res: ServerResponse, body: any, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body ?? null));
  }

  private notFound(res: ServerResponse) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  }

  private error(res: ServerResponse, err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err?.message ?? err) }));
  }
}
