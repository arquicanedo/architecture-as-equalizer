import http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

function parseUrl(req: http.IncomingMessage) {
  const url = new URL(req.url ?? '', `http://${req.headers.host}`);
  return url;
}

export class Router {
  private bus: EventBus;
  private users: UserService;
  private projects: ProjectService;
  private tasks: TaskService;
  private comments: CommentService;
  private notifs: NotificationService;

  constructor() {
    this.bus = new EventBus();
    this.users = new UserService();
    this.projects = new ProjectService();
    this.tasks = new TaskService(this.bus);
    this.comments = new CommentService(this.bus);
    this.notifs = new NotificationService(this.bus);
  }

  handler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const url = parseUrl(req);
      const method = (req.method ?? 'GET').toUpperCase();
      // simple routing
      if (url.pathname === '/users' && method === 'GET') return this.handleListUsers(req, res);
      if (url.pathname === '/users' && method === 'POST') return this.handleCreateUser(req, res);
      if (url.pathname.startsWith('/users/') && method === 'GET') return this.handleGetUser(req, res);
      if (url.pathname.startsWith('/users/') && method === 'PUT') return this.handleUpdateUser(req, res);
      if (url.pathname.startsWith('/users/') && method === 'DELETE') return this.handleDeleteUser(req, res);

      if (url.pathname === '/projects' && method === 'GET') return this.handleListProjects(req, res);
      if (url.pathname === '/projects' && method === 'POST') return this.handleCreateProject(req, res);
      if (url.pathname.startsWith('/projects/') && method === 'GET') return this.handleGetProject(req, res);
      if (url.pathname.startsWith('/projects/') && method === 'PUT') return this.handleUpdateProject(req, res);
      if (url.pathname.startsWith('/projects/') && method === 'DELETE') return this.handleDeleteProject(req, res);
      if (url.pathname.match(/^\/projects\/[^/]+\/members$/) && method === 'POST') return this.handleAddMember(req, res);
      if (url.pathname.match(/^\/projects\/[^/]+\/members$/) && method === 'DELETE') return this.handleRemoveMember(req, res);

      if (url.pathname === '/tasks' && method === 'GET') return this.handleListTasks(req, res);
      if (url.pathname === '/tasks' && method === 'POST') return this.handleCreateTask(req, res);
      if (url.pathname.match(/^\/tasks\/[^/]+$/) && method === 'GET') return this.handleGetTask(req, res);
      if (url.pathname.match(/^\/tasks\/[^/]+$/) && method === 'PUT') return this.handleUpdateTask(req, res);
      if (url.pathname.match(/^\/tasks\/[^/]+$/) && method === 'DELETE') return this.handleDeleteTask(req, res);
      if (url.pathname.match(/^\/tasks\/[^/]+\/status$/) && method === 'PUT') return this.handleChangeStatus(req, res);
      if (url.pathname.match(/^\/tasks\/[^/]+\/assign$/) && method === 'PUT') return this.handleAssignTask(req, res);

      if (url.pathname === '/comments' && method === 'GET') return this.handleListComments(req, res);
      if (url.pathname === '/comments' && method === 'POST') return this.handleCreateComment(req, res);
      if (url.pathname.match(/^\/comments\/[^/]+$/) && method === 'GET') return this.handleGetComment(req, res);
      if (url.pathname.match(/^\/comments\/[^/]+$/) && method === 'DELETE') return this.handleDeleteComment(req, res);

      if (url.pathname === '/notifications' && method === 'GET') return this.handleListNotifications(req, res);
      if (url.pathname.match(/^\/notifications\/[^/]+\/read$/) && method === 'PUT') return this.handleMarkNotificationRead(req, res);

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  };

  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const s = Buffer.concat(chunks).toString() || '{}';
        try {
          const obj = JSON.parse(s);
          resolve(obj);
        } catch (e) {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  }

  // user handlers
  private async handleListUsers(req: http.IncomingMessage, res: http.ServerResponse) {
    const users = this.users.list();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
  }

  private async handleCreateUser(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    if (!body.name || !body.email) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'name and email required' }));
    }
    const u = this.users.create({ name: body.name, email: body.email });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(u));
  }

  private async handleGetUser(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const u = this.users.get(id);
    if (!u) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(u));
  }

  private async handleUpdateUser(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    const u = this.users.update(id, body);
    if (!u) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(u));
  }

  private async handleDeleteUser(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const ok = this.users.delete(id);
    if (!ok) return this.notFound(res);
    res.writeHead(204);
    res.end();
  }

  // project handlers
  private async handleListProjects(req: http.IncomingMessage, res: http.ServerResponse) {
    const ps = this.projects.list();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ps));
  }

  private async handleCreateProject(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    if (!body.name || !body.description) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'name and description required' }));
    }
    const p = this.projects.create({ name: body.name, description: body.description });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(p));
  }

  private async handleGetProject(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const p = this.projects.get(id);
    if (!p) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(p));
  }

  private async handleUpdateProject(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    const p = this.projects.update(id, body);
    if (!p) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(p));
  }

  private async handleDeleteProject(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const ok = this.projects.delete(id);
    if (!ok) return this.notFound(res);
    res.writeHead(204);
    res.end();
  }

  private async handleAddMember(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    if (!body.userId) return this.badRequest(res, 'userId required');
    const p = this.projects.addMember(id, body.userId);
    if (!p) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(p));
  }

  private async handleRemoveMember(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    if (!body.userId) return this.badRequest(res, 'userId required');
    const p = this.projects.removeMember(id, body.userId);
    if (!p) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(p));
  }

  // task handlers
  private async handleListTasks(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = parseUrl(req);
    const projectId = url.searchParams.get('projectId') ?? '';
    if (!projectId) return this.badRequest(res, 'projectId required');
    const ts = this.tasks.listByProject(projectId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ts));
  }

  private async handleCreateTask(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    if (!body.title || !body.description || !body.projectId) return this.badRequest(res, 'title, description, projectId required');
    const t = this.tasks.create({ title: body.title, description: body.description, projectId: body.projectId });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(t));
  }

  private async handleGetTask(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const t = this.tasks.get(id);
    if (!t) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(t));
  }

  private async handleUpdateTask(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    const t = this.tasks.update(id, body);
    if (!t) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(t));
  }

  private async handleDeleteTask(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const ok = this.tasks.delete(id);
    if (!ok) return this.notFound(res);
    res.writeHead(204);
    res.end();
  }

  private async handleChangeStatus(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    if (!body.status) return this.badRequest(res, 'status required');
    const result = this.tasks.changeStatus(id, body.status as any);
    if (result === null) return this.notFound(res);
    if (result instanceof Error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: result.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  }

  private async handleAssignTask(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const body = await this.readBody(req);
    if (!body.assigneeId) return this.badRequest(res, 'assigneeId required');
    const t = this.tasks.assign(id, body.assigneeId);
    if (!t) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(t));
  }

  // comment handlers
  private async handleListComments(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = parseUrl(req);
    const taskId = url.searchParams.get('taskId') ?? '';
    if (!taskId) return this.badRequest(res, 'taskId required');
    const cs = this.comments.listByTask(taskId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cs));
  }

  private async handleCreateComment(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    if (!body.taskId || !body.authorId || !body.body) return this.badRequest(res, 'taskId, authorId, body required');
    // For richer notification payload, look up author name and task title via owned services
    const author = this.users.get(body.authorId);
    const task = this.tasks.get(body.taskId);
    const comment = this.comments.create({ taskId: body.taskId, authorId: body.authorId, body: body.body }, author?.name, task?.title);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(comment));
  }

  private async handleGetComment(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const c = this.comments.get(id);
    if (!c) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(c));
  }

  private async handleDeleteComment(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const ok = this.comments.delete(id);
    if (!ok) return this.notFound(res);
    res.writeHead(204);
    res.end();
  }

  // notification handlers
  private async handleListNotifications(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = parseUrl(req);
    const userId = url.searchParams.get('userId') ?? '';
    if (!userId) return this.badRequest(res, 'userId required');
    const ns = this.notifs.listByUser(userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ns));
  }

  private async handleMarkNotificationRead(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = req.url!.split('/')[2];
    const n = this.notifs.markRead(id);
    if (!n) return this.notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(n));
  }

  // helpers
  private badRequest(res: http.ServerResponse, msg: string) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }

  private notFound(res: http.ServerResponse) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  }
}
