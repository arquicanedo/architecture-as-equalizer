import http from 'http';
import { URL } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

function jsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString() || '';
      if (!s) return resolve(undefined);
      try {
        resolve(JSON.parse(s));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export class Router {
  private userSvc: UserService;
  private projectSvc: ProjectService;
  private taskSvc: TaskService;
  private commentSvc: CommentService;
  private notifSvc: NotificationService;
  private bus: EventBus;

  constructor() {
    this.bus = new EventBus();
    this.userSvc = new UserService();
    this.projectSvc = new ProjectService();
    this.taskSvc = new TaskService(this.bus);
    this.commentSvc = new CommentService(this.bus);
    this.notifSvc = new NotificationService(this.bus);
  }

  handler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    try {
      const method = req.method || 'GET';
      // route matching
      if (method === 'GET' && url.pathname === '/users') {
        return this.ok(res, this.userSvc.getAll());
      }

      if (method === 'POST' && url.pathname === '/users') {
        const body = await jsonBody(req);
        if (!body || !body.id) return this.bad(req, res, 'Invalid body');
        const u = this.userSvc.create(body);
        return this.ok(res, u);
      }

      if (method === 'GET' && url.pathname.startsWith('/users/')) {
        const id = url.pathname.split('/')[2];
        const u = this.userSvc.getById(id);
        if (!u) return this.notFound(res);
        return this.ok(res, u);
      }

      if (method === 'PUT' && url.pathname.startsWith('/users/')) {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        const u = this.userSvc.update(id, body || {});
        return this.ok(res, u);
      }

      if (method === 'DELETE' && url.pathname.startsWith('/users/')) {
        const id = url.pathname.split('/')[2];
        this.userSvc.delete(id);
        return this.ok(res, { success: true });
      }

      // Projects
      if (method === 'GET' && url.pathname === '/projects') {
        return this.ok(res, this.projectSvc.getAll());
      }

      if (method === 'POST' && url.pathname === '/projects') {
        const body = await jsonBody(req);
        if (!body || !body.id) return this.bad(req, res, 'Invalid body');
        const p = this.projectSvc.create({ ...body, memberIds: body.memberIds || [] });
        return this.ok(res, p);
      }

      if (url.pathname.startsWith('/projects/') && method === 'GET') {
        const id = url.pathname.split('/')[2];
        const p = this.projectSvc.getById(id);
        if (!p) return this.notFound(res);
        return this.ok(res, p);
      }

      if (url.pathname.startsWith('/projects/') && method === 'PUT') {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        const p = this.projectSvc.update(id, body || {});
        return this.ok(res, p);
      }

      if (url.pathname.startsWith('/projects/') && method === 'DELETE') {
        const id = url.pathname.split('/')[2];
        this.projectSvc.delete(id);
        return this.ok(res, { success: true });
      }

      if (url.pathname.match(/^\/projects\/[^\/]+\/members$/) && method === 'POST') {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        if (!body || !body.memberId) return this.bad(req, res, 'Invalid body');
        const p = this.projectSvc.addMember(id, body.memberId);
        return this.ok(res, p);
      }

      if (url.pathname.match(/^\/projects\/[^\/]+\/members$/) && method === 'DELETE') {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        if (!body || !body.memberId) return this.bad(req, res, 'Invalid body');
        const p = this.projectSvc.removeMember(id, body.memberId);
        return this.ok(res, p);
      }

      // Tasks
      if (method === 'GET' && url.pathname === '/tasks') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return this.ok(res, this.taskSvc.getAll());
        return this.ok(res, this.taskSvc.getByProject(projectId));
      }

      if (method === 'POST' && url.pathname === '/tasks') {
        const body = await jsonBody(req);
        if (!body || !body.id || !body.title) return this.bad(req, res, 'Invalid body');
        const t = this.taskSvc.create({ id: body.id, title: body.title, description: body.description, status: body.status || 'todo', assigneeId: body.assigneeId, projectId: body.projectId });
        return this.ok(res, t);
      }

      if (url.pathname.startsWith('/tasks/') && method === 'GET') {
        const id = url.pathname.split('/')[2];
        const t = this.taskSvc.getById(id);
        if (!t) return this.notFound(res);
        return this.ok(res, t);
      }

      if (url.pathname.startsWith('/tasks/') && method === 'PUT' && url.pathname.endsWith('/status') === false && url.pathname.endsWith('/assign') === false) {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        const t = this.taskSvc.update(id, body || {});
        return this.ok(res, t);
      }

      if (url.pathname.match(/^\/tasks\/[^\/]+\/status$/) && method === 'PUT') {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        if (!body || !body.status) return this.bad(req, res, 'Invalid body');
        const t = this.taskSvc.changeStatus(id, body.status);
        return this.ok(res, t);
      }

      if (url.pathname.match(/^\/tasks\/[^\/]+\/assign$/) && method === 'PUT') {
        const id = url.pathname.split('/')[2];
        const body = await jsonBody(req);
        if (!body || !body.assigneeId) return this.bad(req, res, 'Invalid body');
        const t = this.taskSvc.assign(id, body.assigneeId);
        return this.ok(res, t);
      }

      if (url.pathname.match(/^\/tasks\/[^\/]+$/) && method === 'DELETE') {
        const id = url.pathname.split('/')[2];
        this.taskSvc.delete(id);
        return this.ok(res, { success: true });
      }

      // Comments
      if (method === 'GET' && url.pathname === '/comments') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return this.bad(req, res, 'taskId required');
        return this.ok(res, this.commentSvc.getByTask(taskId));
      }

      if (method === 'POST' && url.pathname === '/comments') {
        const body = await jsonBody(req);
        if (!body || !body.id || !body.taskId || !body.authorId || !body.body) return this.bad(req, res, 'Invalid body');
        // enrich event payload with taskTitle and assigneeId by looking up task
        const task = this.taskSvc.getById(body.taskId);
        const author = this.userSvc.getById(body.authorId);
        const createdAt = new Date().toISOString();
        const comment = this.commentSvc.create({ id: body.id, taskId: body.taskId, authorId: body.authorId, body: body.body, createdAt }, task?.title, author?.name);
        // Augment the published comment.added payload with assigneeId so NotificationService can notify
        // The CommentService already published comment.added with taskTitle and authorName, but it doesn't include assigneeId.
        // To avoid violating "no direct service-to-service" we will republish a specialized event that includes assigneeId.
        this.bus.publish('comment.added', { commentId: comment.id, taskId: comment.taskId, taskTitle: task?.title, authorId: comment.authorId, authorName: author?.name, assigneeId: task?.assigneeId });
        return this.ok(res, comment);
      }

      if (url.pathname.startsWith('/comments/') && method === 'GET') {
        const id = url.pathname.split('/')[2];
        const c = this.commentSvc.getById(id);
        if (!c) return this.notFound(res);
        return this.ok(res, c);
      }

      if (url.pathname.startsWith('/comments/') && method === 'DELETE') {
        const id = url.pathname.split('/')[2];
        this.commentSvc.delete(id);
        return this.ok(res, { success: true });
      }

      // Notifications
      if (method === 'GET' && url.pathname === '/notifications') {
        const userId = url.searchParams.get('userId');
        if (!userId) return this.bad(req, res, 'userId required');
        return this.ok(res, this.notifSvc.getByUser(userId));
      }

      if (url.pathname.match(/^\/notifications\/[^\/]+\/read$/) && method === 'PUT') {
        const id = url.pathname.split('/')[2];
        const n = this.notifSvc.markAsRead(id);
        return this.ok(res, n);
      }

      return this.notFound(res);
    } catch (err: any) {
      return this.error(res, err);
    }
  };

  private ok(res: http.ServerResponse, body: any) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  private notFound(res: http.ServerResponse) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private bad(req: http.IncomingMessage, res: http.ServerResponse, message: string) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  private error(res: http.ServerResponse, err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
