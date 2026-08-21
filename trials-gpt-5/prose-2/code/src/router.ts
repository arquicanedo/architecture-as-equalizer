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
    private notifications: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = parseUrl(req.url || '', true);
    const method = req.method || 'GET';
    const path = url.pathname || '/';

    // Helper functions
    const readBody = async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return undefined as any;
      try { return JSON.parse(raw); } catch { return undefined as any; }
    };

    const send = (code: number, data?: any) => {
      const body = data !== undefined ? JSON.stringify(data) : '';
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.end(body);
    };

    try {
      // Users
      if (path === '/users' && method === 'GET') return send(200, this.users.list());
      if (path === '/users' && method === 'POST') {
        const body = await readBody();
        const user = this.users.create({ name: body?.name, email: body?.email });
        return send(201, user);
      }
      const userIdMatch = path.match(/^\/users\/(.+)$/);
      if (userIdMatch) {
        const id = userIdMatch[1];
        if (method === 'GET') {
          const user = this.users.get(id);
          return user ? send(200, user) : send(404, { error: 'Not found' });
        }
        if (method === 'PUT') {
          const body = await readBody();
          const updated = this.users.update(id, body || {});
          return updated ? send(200, updated) : send(404, { error: 'Not found' });
        }
        if (method === 'DELETE') {
          const ok = this.users.delete(id);
          return send(ok ? 204 : 404);
        }
      }

      // Projects
      if (path === '/projects' && method === 'GET') return send(200, this.projects.list());
      if (path === '/projects' && method === 'POST') {
        const body = await readBody();
        const project = this.projects.create({ name: body?.name, description: body?.description, members: body?.members });
        return send(201, project);
      }
      const projectIdMembersMatch = path.match(/^\/projects\/([^\/]+)\/members$/);
      if (projectIdMembersMatch) {
        const id = projectIdMembersMatch[1];
        const body = await readBody();
        if (method === 'POST') {
          const updated = this.projects.addMember(id, body?.userId);
          return updated ? send(200, updated) : send(404, { error: 'Not found' });
        }
        if (method === 'DELETE') {
          const updated = this.projects.removeMember(id, body?.userId);
          return updated ? send(200, updated) : send(404, { error: 'Not found' });
        }
      }
      const projectIdMatch = path.match(/^\/projects\/([^\/]+)$/);
      if (projectIdMatch) {
        const id = projectIdMatch[1];
        if (method === 'GET') {
          const project = this.projects.get(id);
          return project ? send(200, project) : send(404, { error: 'Not found' });
        }
        if (method === 'PUT') {
          const body = await readBody();
          const updated = this.projects.update(id, body || {});
          return updated ? send(200, updated) : send(404, { error: 'Not found' });
        }
        if (method === 'DELETE') {
          const ok = this.projects.delete(id);
          return send(ok ? 204 : 404);
        }
      }

      // Tasks
      if (path === '/tasks' && method === 'GET') {
        const projectId = (url.query.projectId as string) || undefined;
        return send(200, this.tasks.list({ projectId }));
      }
      if (path === '/tasks' && method === 'POST') {
        const body = await readBody();
        const task = this.tasks.create({ title: body?.title, description: body?.description, assigneeId: body?.assigneeId, projectId: body?.projectId });
        return send(201, task);
      }
      const taskStatusMatch = path.match(/^\/tasks\/([^\/]+)\/status$/);
      if (taskStatusMatch && method === 'PUT') {
        const id = taskStatusMatch[1];
        const body = await readBody();
        const updated = this.tasks.setStatus(id, body?.status);
        return updated ? send(200, updated) : send(400, { error: 'Invalid status transition or task not found' });
      }
      const taskAssignMatch = path.match(/^\/tasks\/([^\/]+)\/assign$/);
      if (taskAssignMatch && method === 'PUT') {
        const id = taskAssignMatch[1];
        const body = await readBody();
        const updated = this.tasks.assign(id, body?.assigneeId);
        return updated ? send(200, updated) : send(404, { error: 'Task not found' });
      }
      const taskIdMatch = path.match(/^\/tasks\/([^\/]+)$/);
      if (taskIdMatch) {
        const id = taskIdMatch[1];
        if (method === 'GET') {
          const task = this.tasks.get(id);
          return task ? send(200, task) : send(404, { error: 'Not found' });
        }
        if (method === 'PUT') {
          const body = await readBody();
          const updated = this.tasks.update(id, body || {});
          return updated ? send(200, updated) : send(404, { error: 'Not found' });
        }
        if (method === 'DELETE') {
          const ok = this.tasks.delete(id);
          return send(ok ? 204 : 404);
        }
      }

      // Comments
      if (path === '/comments' && method === 'GET') {
        const taskId = (url.query.taskId as string) || undefined;
        return send(200, this.comments.list({ taskId }));
      }
      if (path === '/comments' && method === 'POST') {
        const body = await readBody();
        const comment = this.comments.create({ taskId: body?.taskId, authorId: body?.authorId, text: body?.text });
        return send(201, comment);
      }
      const commentIdMatch = path.match(/^\/comments\/([^\/]+)$/);
      if (commentIdMatch) {
        const id = commentIdMatch[1];
        if (method === 'GET') {
          const c = this.comments.get(id);
          return c ? send(200, c) : send(404, { error: 'Not found' });
        }
        if (method === 'DELETE') {
          const ok = this.comments.delete(id);
          return send(ok ? 204 : 404);
        }
      }

      // Notifications
      if (path === '/notifications' && method === 'GET') {
        const userId = (url.query.userId as string) || undefined;
        return send(200, this.notifications.list({ userId }));
      }
      const notifIdMatch = path.match(/^\/notifications\/([^\/]+)\/read$/);
      if (notifIdMatch && method === 'PUT') {
        const id = notifIdMatch[1];
        const n = this.notifications.markRead(id);
        return n ? send(200, n) : send(404, { error: 'Not found' });
      }

      return send(404, { error: 'Route not found' });
    } catch (err: any) {
      return send(500, { error: err?.message || 'Internal error' });
    }
  }
}
