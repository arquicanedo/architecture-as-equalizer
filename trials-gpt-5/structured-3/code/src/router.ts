import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export interface RouterDeps {
  userService: UserService;
  projectService: ProjectService;
  taskService: TaskService;
  commentService: CommentService;
  notificationService: NotificationService;
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (c: any) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const raw = Buffer.concat(chunks as any).toString('utf8');
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, code: number, data: any) {
  const body = data !== undefined ? JSON.stringify(data) : '';
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
}

export function createServer(deps: RouterDeps) {
  const server = http.createServer(async (req: any, res: any) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;

    try {
      // Users
      if (method === 'GET' && path === '/users') {
        return send(res, 200, deps.userService.getAll());
      }
      if (method === 'POST' && path === '/users') {
        const body = await parseBody(req);
        const created = deps.userService.create({ name: body.name, email: body.email });
        return send(res, 201, created);
      }
      if (method === 'GET' && path.startsWith('/users/')) {
        const id = path.split('/')[2];
        const u = deps.userService.getById(id);
        if (!u) return send(res, 404, { error: 'Not found' });
        return send(res, 200, u);
      }
      if (method === 'PUT' && path.startsWith('/users/')) {
        const id = path.split('/')[2];
        const body = await parseBody(req);
        const updated = deps.userService.update(id, { name: body.name, email: body.email });
        if (!updated) return send(res, 404, { error: 'Not found' });
        return send(res, 200, updated);
      }
      if (method === 'DELETE' && path.startsWith('/users/')) {
        const id = path.split('/')[2];
        const ok = deps.userService.delete(id);
        if (!ok) return send(res, 404, { error: 'Not found' });
        return send(res, 204, undefined);
      }

      // Projects
      if (method === 'GET' && path === '/projects') {
        return send(res, 200, deps.projectService.getAll());
      }
      if (method === 'POST' && path === '/projects') {
        const body = await parseBody(req);
        const created = deps.projectService.create({ name: body.name, description: body.description });
        return send(res, 201, created);
      }
      if (method === 'GET' && path.startsWith('/projects/')) {
        const id = path.split('/')[2];
        const p = deps.projectService.getById(id);
        if (!p) return send(res, 404, { error: 'Not found' });
        return send(res, 200, p);
      }
      if (method === 'PUT' && path.startsWith('/projects/')) {
        const id = path.split('/')[2];
        const body = await parseBody(req);
        const updated = deps.projectService.update(id, { name: body.name, description: body.description, memberIds: body.memberIds });
        if (!updated) return send(res, 404, { error: 'Not found' });
        return send(res, 200, updated);
      }
      if (method === 'DELETE' && path.startsWith('/projects/')) {
        const id = path.split('/')[2];
        const ok = deps.projectService.delete(id);
        if (!ok) return send(res, 404, { error: 'Not found' });
        return send(res, 204, undefined);
      }
      if (method === 'POST' && path.match(/^\/projects\/[^/]+\/members$/)) {
        const id = path.split('/')[2];
        const body = await parseBody(req);
        const updated = deps.projectService.addMember(id, body.userId);
        if (!updated) return send(res, 404, { error: 'Not found' });
        return send(res, 200, updated);
      }
      if (method === 'DELETE' && path.match(/^\/projects\/[^/]+\/members$/)) {
        const id = path.split('/')[2];
        const body = await parseBody(req); // assume body contains userId
        const updated = deps.projectService.removeMember(id, body.userId);
        if (!updated) return send(res, 404, { error: 'Not found' });
        return send(res, 200, updated);
      }

      // Tasks
      if (method === 'GET' && path === '/tasks') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return send(res, 400, { error: 'projectId is required' });
        return send(res, 200, deps.taskService.getByProject(projectId));
      }
      if (method === 'POST' && path === '/tasks') {
        const body = await parseBody(req);
        const created = deps.taskService.create({ title: body.title, description: body.description, projectId: body.projectId, assigneeId: body.assigneeId });
        return send(res, 201, created);
      }
      if (method === 'GET' && path.startsWith('/tasks/')) {
        const id = path.split('/')[2];
        const t = deps.taskService.getById(id);
        if (!t) return send(res, 404, { error: 'Not found' });
        return send(res, 200, t);
      }
      if (method === 'PUT' && path.match(/^\/tasks\/[^/]+$/)) {
        const id = path.split('/')[2];
        const body = await parseBody(req);
        const updated = deps.taskService.update(id, { title: body.title, description: body.description, status: body.status as TaskStatus, assigneeId: body.assigneeId, projectId: body.projectId });
        if (!updated) return send(res, 404, { error: 'Not found or invalid update' });
        return send(res, 200, updated);
      }
      if (method === 'DELETE' && path.match(/^\/tasks\/[^/]+$/)) {
        const id = path.split('/')[2];
        const ok = deps.taskService.delete(id);
        if (!ok) return send(res, 404, { error: 'Not found' });
        return send(res, 204, undefined);
      }
      if (method === 'PUT' && path.match(/^\/tasks\/[^/]+\/status$/)) {
        const id = path.split('/')[2];
        const body = await parseBody(req);
        const updated = deps.taskService.changeStatus(id, body.status as TaskStatus);
        if (!updated) return send(res, 400, { error: 'Invalid status transition or task not found' });
        return send(res, 200, updated);
      }
      if (method === 'PUT' && path.match(/^\/tasks\/[^/]+\/assign$/)) {
        const id = path.split('/')[2];
        const body = await parseBody(req);
        const updated = deps.taskService.assign(id, body.assigneeId);
        if (!updated) return send(res, 404, { error: 'Not found' });
        return send(res, 200, updated);
      }

      // Comments
      if (method === 'GET' && path === '/comments') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return send(res, 400, { error: 'taskId is required' });
        return send(res, 200, deps.commentService.getByTask(taskId));
      }
      if (method === 'POST' && path === '/comments') {
        const body = await parseBody(req);
        const created = deps.commentService.create({ taskId: body.taskId, authorId: body.authorId, body: body.body });
        return send(res, 201, created);
      }
      if (method === 'GET' && path.startsWith('/comments/')) {
        const id = path.split('/')[2];
        const c = deps.commentService.getById(id);
        if (!c) return send(res, 404, { error: 'Not found' });
        return send(res, 200, c);
      }
      if (method === 'DELETE' && path.startsWith('/comments/')) {
        const id = path.split('/')[2];
        const ok = deps.commentService.delete(id);
        if (!ok) return send(res, 404, { error: 'Not found' });
        return send(res, 204, undefined);
      }

      // Notifications
      if (method === 'GET' && path === '/notifications') {
        const userId = url.searchParams.get('userId');
        if (!userId) return send(res, 400, { error: 'userId is required' });
        return send(res, 200, deps.notificationService.getByUser(userId));
      }
      if (method === 'PUT' && path.match(/^\/notifications\/[^/]+\/read$/)) {
        const id = path.split('/')[2];
        const updated = deps.notificationService.markAsRead(id);
        if (!updated) return send(res, 404, { error: 'Not found' });
        return send(res, 200, updated);
      }

      // Not found
      send(res, 404, { error: 'Route not found' });
    } catch (err: any) {
      send(res, 400, { error: err?.message || 'Bad request' });
    }
  });
  return server;
}
