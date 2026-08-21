import { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export class ApiRouter {
  constructor(
    private bus: EventBus,
    private users: UserService,
    private projects: ProjectService,
    private tasks: TaskService,
    private comments: CommentService,
    private notifications: NotificationService,
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = parseUrl(req.url || '', true);
    const method = (req.method || 'GET').toUpperCase();
    const path = url.pathname || '/';

    const send = (code: number, body: any) => {
      const data = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', Buffer.byteLength(data));
      res.end(data);
    };

    const notFound = () => send(404, { error: 'Not Found' });
    const badRequest = (msg: string) => send(400, { error: msg });

    const readBody = async () => {
      const chunks: any[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (e) {
        return {};
      }
    };

    try {
      // Users
      if (path === '/users' && method === 'GET') {
        return send(200, this.users.list());
      }
      if (path === '/users' && method === 'POST') {
        const body = await readBody();
        if (!body.name || !body.email) return badRequest('name and email required');
        const user = this.users.create(body.name, body.email);
        return send(201, user);
      }
      if (path.startsWith('/users/') && ['GET', 'PUT', 'DELETE'].includes(method)) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const user = this.users.get(id);
          if (!user) return notFound();
          return send(200, user);
        }
        if (method === 'PUT') {
          const body = await readBody();
          const updated = this.users.update(id, { name: body.name, email: body.email });
          if (!updated) return notFound();
          return send(200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.users.delete(id);
          if (!ok) return notFound();
          return send(204, {});
        }
      }

      // Projects
      if (path === '/projects' && method === 'GET') {
        return send(200, this.projects.list());
      }
      if (path === '/projects' && method === 'POST') {
        const body = await readBody();
        if (!body.name || !body.description) return badRequest('name and description required');
        const project = this.projects.create(body.name, body.description);
        return send(201, project);
      }
      if (path.startsWith('/projects/') && ['GET', 'PUT', 'DELETE'].includes(method)) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const project = this.projects.get(id);
          if (!project) return notFound();
          return send(200, project);
        }
        if (method === 'PUT') {
          const body = await readBody();
          const updated = this.projects.update(id, { name: body.name, description: body.description });
          if (!updated) return notFound();
          return send(200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.projects.delete(id);
          if (!ok) return notFound();
          return send(204, {});
        }
      }

      if (path.startsWith('/projects/') && (method === 'POST' || method === 'DELETE') && path.endsWith('/members')) {
        const id = path.split('/')[2];
        const body = await readBody();
        if (!body.userId) return badRequest('userId required');
        const exists = this.users.get(body.userId);
        if (!exists) return badRequest('user does not exist');
        const project = method === 'POST' ? this.projects.addMember(id, body.userId) : this.projects.removeMember(id, body.userId);
        if (!project) return notFound();
        return send(200, project);
      }

      // Tasks
      if (path === '/tasks' && method === 'GET') {
        const projectId = (url.query.projectId as string) || undefined;
        return send(200, this.tasks.list({ projectId }));
      }
      if (path === '/tasks' && method === 'POST') {
        const body = await readBody();
        if (!body.title || !body.description || !body.projectId) return badRequest('title, description, projectId required');
        const project = this.projects.get(body.projectId);
        if (!project) return badRequest('project does not exist');
        const task = this.tasks.create(body.title, body.description, body.projectId, body.assignee);
        return send(201, task);
      }
      if (path.startsWith('/tasks/') && ['GET', 'PUT', 'DELETE'].includes(method)) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const task = this.tasks.get(id);
          if (!task) return notFound();
          return send(200, task);
        }
        if (method === 'PUT') {
          const body = await readBody();
          const updated = this.tasks.update(id, { title: body.title, description: body.description, assignee: body.assignee, projectId: body.projectId });
          if (!updated) return notFound();
          return send(200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.tasks.delete(id);
          if (!ok) return notFound();
          return send(204, {});
        }
      }

      if (path.startsWith('/tasks/') && method === 'PUT' && path.endsWith('/status')) {
        const id = path.split('/')[2];
        const body = await readBody();
        try {
          const updated = this.tasks.setStatus(id, body.status);
          if (!updated) return notFound();
          return send(200, updated);
        } catch (e: any) {
          return badRequest(e.message || 'invalid status');
        }
      }
      if (path.startsWith('/tasks/') && method === 'PUT' && path.endsWith('/assign')) {
        const id = path.split('/')[2];
        const body = await readBody();
        const exists = this.users.get(body.userId);
        if (!exists) return badRequest('user does not exist');
        const updated = this.tasks.assign(id, body.userId);
        if (!updated) return notFound();
        return send(200, updated);
      }

      // Comments
      if (path === '/comments' && method === 'GET') {
        const taskId = (url.query.taskId as string) || undefined;
        return send(200, this.comments.list({ taskId }));
      }
      if (path === '/comments' && method === 'POST') {
        const body = await readBody();
        if (!body.taskId || !body.authorId || !body.body) return badRequest('taskId, authorId, body required');
        const task = this.tasks.get(body.taskId);
        if (!task) return badRequest('task does not exist');
        const author = this.users.get(body.authorId);
        if (!author) return badRequest('author does not exist');
        const comment = this.comments.create(body.taskId, body.authorId, body.body);
        // Enrich and notify assignee via enriched event
        this.bus.emit('comment.added.enriched', { taskId: body.taskId, assignee: task.assignee, authorId: body.authorId });
        return send(201, comment);
      }
      if (path.startsWith('/comments/') && ['GET', 'DELETE'].includes(method)) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const comment = this.comments.get(id);
          if (!comment) return notFound();
          return send(200, comment);
        }
        if (method === 'DELETE') {
          const ok = this.comments.delete(id);
          if (!ok) return notFound();
          return send(204, {});
        }
      }

      // Notifications
      if (path === '/notifications' && method === 'GET') {
        const userId = (url.query.userId as string) || undefined;
        return send(200, this.notifications.list({ userId }));
      }
      if (path.startsWith('/notifications/') && method === 'PUT' && path.endsWith('/read')) {
        const id = path.split('/')[2];
        const updated = this.notifications.markRead(id);
        if (!updated) return notFound();
        return send(200, updated);
      }

      return notFound();
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error', detail: err?.message }));
    }
  }
}
