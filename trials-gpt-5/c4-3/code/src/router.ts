import http, { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      .on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return resolve({});
        try {
          const data = JSON.parse(raw);
          resolve(data);
        } catch (err) {
          reject(new Error('Invalid JSON body'));
        }
      })
      .on('error', (err) => reject(err));
  });
}

function send(res: ServerResponse, status: number, data?: any) {
  const body = data !== undefined ? JSON.stringify(data) : '';
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export class ApiRouter {
  private eventBus = new EventBus();
  private userService = new UserService();
  private projectService = new ProjectService();
  private taskService = new TaskService(this.eventBus);
  private commentService = new CommentService(this.eventBus);
  private notificationService = new NotificationService(this.eventBus);

  private server = http.createServer(this.requestListener.bind(this));

  listen(port: number): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        const address = this.server.address() as any;
        const actualPort: number = typeof address === 'object' && address && 'port' in address ? address.port : port;
        resolve(actualPort);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private async requestListener(req: IncomingMessage, res: ServerResponse) {
    const url = parseUrl(req.url || '', true);
    const method = req.method || 'GET';
    const pathname = url.pathname || '/';

    // Route matching helpers
    const match = (pattern: RegExp) => pattern.exec(pathname || '');

    try {
      // Users
      if (method === 'GET' && pathname === '/users') {
        return send(res, 200, this.userService.getAll());
      }
      if (method === 'POST' && pathname === '/users') {
        const body = await parseBody(req);
        const user = this.userService.create({ name: body.name, email: body.email });
        return send(res, 201, user);
      }
      let m = match(/^\/users\/([^/]+)$/);
      if (m) {
        const id = m[1];
        if (method === 'GET') {
          const user = this.userService.getById(id);
          if (!user) return send(res, 404, { error: 'User not found' });
          return send(res, 200, user);
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = this.userService.update(id, { name: body.name, email: body.email });
          if (!updated) return send(res, 404, { error: 'User not found' });
          return send(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.userService.delete(id);
          return send(res, ok ? 204 : 404, ok ? undefined : { error: 'User not found' });
        }
      }

      // Projects
      if (method === 'GET' && pathname === '/projects') {
        return send(res, 200, this.projectService.getAll());
      }
      if (method === 'POST' && pathname === '/projects') {
        const body = await parseBody(req);
        const project = this.projectService.create({ name: body.name, description: body.description });
        return send(res, 201, project);
      }
      m = match(/^\/projects\/([^/]+)$/);
      if (m) {
        const id = m[1];
        if (method === 'GET') {
          const project = this.projectService.getById(id);
          if (!project) return send(res, 404, { error: 'Project not found' });
          return send(res, 200, project);
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = this.projectService.update(id, { name: body.name, description: body.description });
          if (!updated) return send(res, 404, { error: 'Project not found' });
          return send(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.projectService.delete(id);
          return send(res, ok ? 204 : 404, ok ? undefined : { error: 'Project not found' });
        }
      }
      m = match(/^\/projects\/([^/]+)\/members$/);
      if (m) {
        const id = m[1];
        const body = await parseBody(req);
        if (method === 'POST') {
          const updated = this.projectService.addMember(id, body.userId);
          if (!updated) return send(res, 404, { error: 'Project not found' });
          return send(res, 200, updated);
        }
        if (method === 'DELETE') {
          const updated = this.projectService.removeMember(id, body.userId);
          if (!updated) return send(res, 404, { error: 'Project not found' });
          return send(res, 200, updated);
        }
      }

      // Tasks
      if (method === 'GET' && pathname === '/tasks') {
        const projectId = url.query['projectId'] as string;
        if (!projectId) return send(res, 400, { error: 'projectId is required' });
        return send(res, 200, this.taskService.getByProject(projectId));
      }
      if (method === 'POST' && pathname === '/tasks') {
        const body = await parseBody(req);
        const task = this.taskService.create({
          title: body.title,
          description: body.description,
          projectId: body.projectId,
          assigneeId: body.assigneeId ?? null,
        });
        return send(res, 201, task);
      }
      m = match(/^\/tasks\/([^/]+)$/);
      if (m) {
        const id = m[1];
        if (method === 'GET') {
          const task = this.taskService.getById(id);
          if (!task) return send(res, 404, { error: 'Task not found' });
          return send(res, 200, task);
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = this.taskService.update(id, { title: body.title, description: body.description, projectId: body.projectId });
          if (!updated) return send(res, 404, { error: 'Task not found' });
          return send(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.taskService.delete(id);
          return send(res, ok ? 204 : 404, ok ? undefined : { error: 'Task not found' });
        }
      }
      m = match(/^\/tasks\/([^/]+)\/status$/);
      if (m && method === 'PUT') {
        const id = m[1];
        const body = await parseBody(req);
        try {
          const updated = this.taskService.changeStatus(id, body.status);
          if (!updated) return send(res, 404, { error: 'Task not found' });
          return send(res, 200, updated);
        } catch (err: any) {
          return send(res, 400, { error: err.message || 'Invalid status change' });
        }
      }
      m = match(/^\/tasks\/([^/]+)\/assign$/);
      if (m && method === 'PUT') {
        const id = m[1];
        const body = await parseBody(req);
        const updated = this.taskService.assign(id, body.assigneeId ?? null);
        if (!updated) return send(res, 404, { error: 'Task not found' });
        return send(res, 200, updated);
      }

      // Comments
      if (method === 'GET' && pathname === '/comments') {
        const taskId = url.query['taskId'] as string;
        if (!taskId) return send(res, 400, { error: 'taskId is required' });
        return send(res, 200, this.commentService.getByTask(taskId));
      }
      if (method === 'POST' && pathname === '/comments') {
        const body = await parseBody(req);
        // The router can enrich the event payload since it can read across services
        const task = this.taskService.getById(body.taskId);
        const user = this.userService.getById(body.authorId);
        const comment = this.commentService.create({
          taskId: body.taskId,
          authorId: body.authorId,
          body: body.body,
          taskTitle: task?.title,
          authorName: user?.name,
          assigneeId: task?.assigneeId ?? null,
        });
        return send(res, 201, comment);
      }
      m = match(/^\/comments\/([^/]+)$/);
      if (m) {
        const id = m[1];
        if (method === 'GET') {
          const comment = this.commentService.getById(id);
          if (!comment) return send(res, 404, { error: 'Comment not found' });
          return send(res, 200, comment);
        }
        if (method === 'DELETE') {
          const ok = this.commentService.delete(id);
          return send(res, ok ? 204 : 404, ok ? undefined : { error: 'Comment not found' });
        }
      }

      // Notifications
      if (method === 'GET' && pathname === '/notifications') {
        const userId = url.query['userId'] as string;
        if (!userId) return send(res, 400, { error: 'userId is required' });
        return send(res, 200, this.notificationService.getByUser(userId));
      }
      m = match(/^\/notifications\/([^/]+)\/read$/);
      if (m && method === 'PUT') {
        const id = m[1];
        const updated = this.notificationService.markAsRead(id);
        if (!updated) return send(res, 404, { error: 'Notification not found' });
        return send(res, 200, updated);
      }

      // Not found
      send(res, 404, { error: 'Not found' });
    } catch (err: any) {
      send(res, 500, { error: err.message || 'Internal Server Error' });
    }
  }
}
