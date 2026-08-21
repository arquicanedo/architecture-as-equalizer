import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, Task } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: any) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

export class ApiRouter {
  private server?: http.Server;
  constructor(
    private bus: EventBus,
    private users: UserService,
    private projects: ProjectService,
    private tasks: TaskService,
    private comments: CommentService,
    private notifs: NotificationService
  ) {
    // Enrich comment.added events with assigneeId by observing the bus and the task store via the router.
    // Since services cannot call each other, the router listens and republishes with assigneeId when possible.
    this.bus.subscribe('comment.added', (p: any) => {
      // Prevent infinite rebroadcast: only enrich if assigneeId is missing
      if (p && typeof p === 'object' && 'assigneeId' in p) return;
      const task: Task | undefined = this.tasks.getById(p.taskId);
      if (task && task.assigneeId) {
        const enriched = { ...p, assigneeId: task.assigneeId };
        this.bus.publish('comment.added', enriched); // Publish enriched event; NotificationService will act on it
      }
    });
  }

  start(port: number): Promise<void> {
    this.server = http.createServer(async (req, res) => {
      try {
        await this.route(req, res);
      } catch (err: any) {
        send(res, 500, { error: 'Internal Server Error', details: err?.message });
      }
    });
    return new Promise((resolve) => this.server!.listen(port, resolve));
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private async route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '/', 'http://localhost');
    const method = req.method || 'GET';

    // Users
    if (method === 'GET' && url.pathname === '/users') {
      return send(res, 200, this.users.getAll());
    }
    if (method === 'POST' && url.pathname === '/users') {
      const body = await parseBody(req);
      const created = this.users.create({ name: body.name, email: body.email });
      return send(res, 201, created);
    }
    if (method === 'GET' && url.pathname.startsWith('/users/')) {
      const id = url.pathname.split('/')[2];
      const user = this.users.getById(id);
      if (!user) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, user);
    }
    if (method === 'PUT' && url.pathname.startsWith('/users/')) {
      const id = url.pathname.split('/')[2];
      const body = await parseBody(req);
      const updated = this.users.update(id, { name: body.name, email: body.email });
      if (!updated) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, updated);
    }
    if (method === 'DELETE' && url.pathname.startsWith('/users/')) {
      const id = url.pathname.split('/')[2];
      const ok = this.users.delete(id);
      return send(res, ok ? 204 : 404, ok ? {} : { error: 'Not Found' });
    }

    // Projects
    if (method === 'GET' && url.pathname === '/projects') {
      return send(res, 200, this.projects.getAll());
    }
    if (method === 'POST' && url.pathname === '/projects') {
      const body = await parseBody(req);
      const created = this.projects.create({ name: body.name, description: body.description });
      return send(res, 201, created);
    }
    if (method === 'GET' && url.pathname.startsWith('/projects/')) {
      const [, , id, rest] = url.pathname.split('/');
      if (!id || rest) {
        // Could be nested routes like /projects/:id/members
      } else {
        const proj = this.projects.getById(id);
        if (!proj) return send(res, 404, { error: 'Not Found' });
        return send(res, 200, proj);
      }
    }
    if (method === 'PUT' && url.pathname.match(/^\/projects\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const body = await parseBody(req);
      const updated = this.projects.update(id, { name: body.name, description: body.description });
      if (!updated) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, updated);
    }
    if (method === 'DELETE' && url.pathname.match(/^\/projects\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const ok = this.projects.delete(id);
      return send(res, ok ? 204 : 404, ok ? {} : { error: 'Not Found' });
    }
    if (url.pathname.match(/^\/projects\/[^/]+\/members$/)) {
      const id = url.pathname.split('/')[2];
      if (method === 'POST') {
        const body = await parseBody(req);
        const updated = this.projects.addMember(id, body.userId);
        if (!updated) return send(res, 404, { error: 'Not Found' });
        return send(res, 200, updated);
      }
      if (method === 'DELETE') {
        const body = await parseBody(req);
        const updated = this.projects.removeMember(id, body.userId);
        if (!updated) return send(res, 404, { error: 'Not Found' });
        return send(res, 200, updated);
      }
    }

    // Tasks
    if (method === 'GET' && url.pathname === '/tasks') {
      const projectId = url.searchParams.get('projectId');
      if (projectId) return send(res, 200, this.tasks.getByProject(projectId));
      return send(res, 200, this.tasks.getAll());
    }
    if (method === 'POST' && url.pathname === '/tasks') {
      const body = await parseBody(req);
      const created = this.tasks.create({
        title: body.title,
        description: body.description,
        projectId: body.projectId,
        assigneeId: body.assigneeId ?? null,
      });
      return send(res, 201, created);
    }
    if (method === 'GET' && url.pathname.match(/^\/tasks\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const task = this.tasks.getById(id);
      if (!task) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, task);
    }
    if (method === 'PUT' && url.pathname.match(/^\/tasks\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const body = await parseBody(req);
      const updated = this.tasks.update(id, { title: body.title, description: body.description, assigneeId: body.assigneeId });
      if (!updated) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, updated);
    }
    if (method === 'DELETE' && url.pathname.match(/^\/tasks\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const ok = this.tasks.delete(id);
      return send(res, ok ? 204 : 404, ok ? {} : { error: 'Not Found' });
    }
    if (method === 'PUT' && url.pathname.match(/^\/tasks\/[^/]+\/status$/)) {
      const id = url.pathname.split('/')[2];
      const body = await parseBody(req);
      const updated = this.tasks.changeStatus(id, body.newStatus);
      if (!updated) return send(res, 400, { error: 'Invalid status transition or task not found' });
      return send(res, 200, updated);
    }
    if (method === 'PUT' && url.pathname.match(/^\/tasks\/[^/]+\/assign$/)) {
      const id = url.pathname.split('/')[2];
      const body = await parseBody(req);
      const updated = this.tasks.assign(id, body.assigneeId ?? null);
      if (!updated) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, updated);
    }

    // Comments
    if (method === 'GET' && url.pathname === '/comments') {
      const taskId = url.searchParams.get('taskId');
      if (!taskId) return send(res, 400, { error: 'taskId required' });
      return send(res, 200, this.comments.getByTask(taskId));
    }
    if (method === 'POST' && url.pathname === '/comments') {
      const body = await parseBody(req);
      const task = this.tasks.getById(body.taskId);
      const user = this.users.getById(body.authorId);
      const created = this.comments.create({
        taskId: body.taskId,
        authorId: body.authorId,
        body: body.body,
        taskTitle: task?.title,
        authorName: user?.name,
      });
      return send(res, 201, created);
    }
    if (method === 'GET' && url.pathname.match(/^\/comments\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const c = this.comments.getById(id);
      if (!c) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, c);
    }
    if (method === 'DELETE' && url.pathname.match(/^\/comments\/[^/]+$/)) {
      const id = url.pathname.split('/')[2];
      const ok = this.comments.delete(id);
      return send(res, ok ? 204 : 404, ok ? {} : { error: 'Not Found' });
    }

    // Notifications
    if (method === 'GET' && url.pathname === '/notifications') {
      const userId = url.searchParams.get('userId');
      if (!userId) return send(res, 400, { error: 'userId required' });
      return send(res, 200, this.notifs.getByUser(userId));
    }
    if (method === 'PUT' && url.pathname.match(/^\/notifications\/[^/]+\/read$/)) {
      const id = url.pathname.split('/')[2];
      const updated = this.notifs.markAsRead(id);
      if (!updated) return send(res, 404, { error: 'Not Found' });
      return send(res, 200, updated);
    }

    // Fallback
    send(res, 404, { error: 'Not Found' });
  }
}
