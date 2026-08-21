import { IncomingMessage, ServerResponse } from 'http';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { EventBus } from './event-bus';

function parseUrlPath(url: string): { pathname: string; query: Record<string, string> } {
  const [path, q] = url.split('?');
  const query: Record<string, string> = {};
  if (q) {
    for (const part of q.split('&')) {
      const [k, v] = part.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { pathname: path, query };
}

export class Router {
  constructor(
    private bus: EventBus,
    private users: UserService,
    private projects: ProjectService,
    private tasks: TaskService,
    private comments: CommentService,
    private notifications: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse) {
    const method = req.method || 'GET';
    const url = req.url || '/';
    const { pathname, query } = parseUrlPath(url);

    res.setHeader('Content-Type', 'application/json');

    try {
      if (pathname === '/users' && method === 'GET') {
        return this.ok(res, this.users.getAll());
      }
      if (pathname === '/users' && method === 'POST') {
        const body = await this.readJson(req);
        const u = this.users.create(body);
        return this.created(res, u);
      }
      if (pathname.startsWith('/users/') ) {
        const id = pathname.split('/')[2];
        if (method === 'GET') return this.ok(res, this.users.getById(id));
        if (method === 'PUT') {
          const body = await this.readJson(req);
          const updated = this.users.update(id, body);
          return this.ok(res, updated);
        }
        if (method === 'DELETE') {
          const del = this.users.delete(id);
          return this.ok(res, { deleted: del });
        }
      }

      // Projects
      if (pathname === '/projects' && method === 'GET') return this.ok(res, this.projects.getAll());
      if (pathname === '/projects' && method === 'POST') {
        const body = await this.readJson(req);
        const p = this.projects.create(body);
        return this.created(res, p);
      }
      if (pathname.startsWith('/projects/')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') return this.ok(res, this.projects.getById(id));
          if (method === 'PUT') {
            const body = await this.readJson(req);
            return this.ok(res, this.projects.update(id, body));
          }
          if (method === 'DELETE') return this.ok(res, { deleted: this.projects.delete(id) });
        }
        if (parts.length === 3 && parts[2] === 'members') {
          if (method === 'POST') {
            const body = await this.readJson(req);
            return this.ok(res, this.projects.addMember(id, body.userId));
          }
          if (method === 'DELETE') {
            const body = await this.readJson(req);
            return this.ok(res, this.projects.removeMember(id, body.userId));
          }
        }
      }

      // Tasks
      if (pathname === '/tasks' && method === 'GET') {
        const projectId = query['projectId'];
        return this.ok(res, this.tasks.getAll(projectId ? { projectId } : undefined));
      }
      if (pathname === '/tasks' && method === 'POST') {
        const body = await this.readJson(req);
        const t = this.tasks.create(body);
        return this.created(res, t);
      }
      if (pathname.startsWith('/tasks/')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') return this.ok(res, this.tasks.getById(id));
          if (method === 'PUT') {
            const body = await this.readJson(req);
            return this.ok(res, this.tasks.update(id, body));
          }
          if (method === 'DELETE') return this.ok(res, { deleted: this.tasks.delete(id) });
        }
        if (parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
          const body = await this.readJson(req);
          try {
            const updated = this.tasks.setStatus(id, body.status);
            return this.ok(res, updated);
          } catch (err: any) {
            return this.error(res, 400, err.message);
          }
        }
        if (parts.length === 3 && parts[2] === 'assign' && method === 'PUT') {
          const body = await this.readJson(req);
          const updated = this.tasks.assign(id, body.userId);
          return this.ok(res, updated);
        }
      }

      // Comments
      if (pathname === '/comments' && method === 'GET') {
        const taskId = query['taskId'];
        return this.ok(res, this.comments.getAll(taskId ? { taskId } : undefined));
      }
      if (pathname === '/comments' && method === 'POST') {
        const body = await this.readJson(req);
        // We want to include task assignee info in the event so notifications can be created.
        const comment = this.comments.create(body);
        // find task and include assignee in event via bus emit directly here
        const task = this.tasks.getById(comment.taskId);
        const payload: any = { ...comment };
        if (task) payload.taskAssignee = task.assignee;
        // also include task title maybe
        if (task) payload.taskTitle = task.title;
        // emit enriched event
        this.bus.emit('comment.added', payload);
        return this.created(res, comment);
      }
      if (pathname.startsWith('/comments/')) {
        const id = pathname.split('/')[2];
        if (method === 'GET') return this.ok(res, this.comments.getById(id));
        if (method === 'DELETE') return this.ok(res, { deleted: this.comments.delete(id) });
      }

      // Notifications
      if (pathname === '/notifications' && method === 'GET') {
        const userId = query['userId'];
        return this.ok(res, this.notifications.getAll(userId ? { userId } : undefined));
      }
      if (pathname.startsWith('/notifications/')) {
        const id = pathname.split('/')[2];
        if (pathname.endsWith('/read') || pathname.endsWith('/read/')) {
          // path like /notifications/:id/read handled as single segment
        }
        if (req.method === 'PUT' && pathname.endsWith('/read')) {
          const n = this.notifications.markRead(id);
          return this.ok(res, n);
        }
      }

      return this.notFound(res);
    } catch (err: any) {
      return this.error(res, 500, err.message || String(err));
    }
  }

  private async readJson(req: IncomingMessage) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(chunk as Uint8Array);
    const str = Buffer.concat(chunks).toString('utf8');
    if (!str) return {};
    return JSON.parse(str);
  }

  private ok(res: ServerResponse, data: any) {
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  }
  private created(res: ServerResponse, data: any) {
    res.statusCode = 201;
    res.end(JSON.stringify(data));
  }
  private notFound(res: ServerResponse) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  }
  private error(res: ServerResponse, code: number, message: string) {
    res.statusCode = code;
    res.end(JSON.stringify({ error: message }));
  }
}
