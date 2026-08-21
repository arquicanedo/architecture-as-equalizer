import * as http from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export interface Services {
  users: UserService;
  projects: ProjectService;
  tasks: TaskService;
  comments: CommentService;
  notifications: NotificationService;
}

function sendJSON(res: import('http').ServerResponse, status: number, data: any) {
  const body = JSON.stringify(data);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

async function parseBody(req: import('http').IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export function buildServer(services: Services) {
  return http.createServer(async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
    if (!req.url || !req.method) {
      sendJSON(res, 400, { error: 'Invalid request' });
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    try {
      // Users
      if (method === 'GET' && pathname === '/users') {
        return sendJSON(res, 200, services.users.getAll());
      }
      if (method === 'POST' && pathname === '/users') {
        const body = await parseBody(req);
        if (!body || typeof body.name !== 'string' || typeof body.email !== 'string') {
          return sendJSON(res, 400, { error: 'Missing name or email' });
        }
        const user = services.users.create({ name: body.name, email: body.email });
        return sendJSON(res, 201, user);
      }
      if (method === 'GET' && pathname.startsWith('/users/')) {
        const id = pathname.split('/')[2];
        const user = services.users.getById(id);
        if (!user) return sendJSON(res, 404, { error: 'User not found' });
        return sendJSON(res, 200, user);
      }
      if (method === 'PUT' && pathname.startsWith('/users/')) {
        const id = pathname.split('/')[2];
        const body = await parseBody(req);
        const updated = services.users.update(id, body || {});
        if (!updated) return sendJSON(res, 404, { error: 'User not found' });
        return sendJSON(res, 200, updated);
      }
      if (method === 'DELETE' && pathname.startsWith('/users/')) {
        const id = pathname.split('/')[2];
        const ok = services.users.delete(id);
        if (!ok) return sendJSON(res, 404, { error: 'User not found' });
        return sendJSON(res, 204, {});
      }

      // Projects
      if (method === 'GET' && pathname === '/projects') {
        return sendJSON(res, 200, services.projects.getAll());
      }
      if (method === 'POST' && pathname === '/projects') {
        const body = await parseBody(req);
        if (!body || typeof body.name !== 'string') {
          return sendJSON(res, 400, { error: 'Missing name' });
        }
        const project = services.projects.create({ name: body.name, description: body.description, memberIds: body.memberIds });
        return sendJSON(res, 201, project);
      }
      if (method === 'GET' && pathname.startsWith('/projects/')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          const project = services.projects.getById(id);
          if (!project) return sendJSON(res, 404, { error: 'Project not found' });
          return sendJSON(res, 200, project);
        }
        if (parts.length === 3 && parts[2] === 'members' && method === 'GET') {
          const project = services.projects.getById(id);
          if (!project) return sendJSON(res, 404, { error: 'Project not found' });
          return sendJSON(res, 200, project.memberIds);
        }
      }
      if (method === 'PUT' && pathname.startsWith('/projects/')) {
        const id = pathname.split('/')[2];
        const body = await parseBody(req);
        const updated = services.projects.update(id, body || {});
        if (!updated) return sendJSON(res, 404, { error: 'Project not found' });
        return sendJSON(res, 200, updated);
      }
      if (method === 'DELETE' && pathname.startsWith('/projects/')) {
        const id = pathname.split('/')[2];
        const ok = services.projects.delete(id);
        if (!ok) return sendJSON(res, 404, { error: 'Project not found' });
        return sendJSON(res, 204, {});
      }
      if (pathname.match(/^\/projects\/[^\/]+\/members$/)) {
        const id = pathname.split('/')[2];
        if (method === 'POST') {
          const body = await parseBody(req);
          if (!body || typeof body.userId !== 'string') return sendJSON(res, 400, { error: 'Missing userId' });
          const updated = services.projects.addMember(id, body.userId);
          if (!updated) return sendJSON(res, 404, { error: 'Project not found' });
          return sendJSON(res, 200, updated);
        }
        if (method === 'DELETE') {
          const body = await parseBody(req);
          if (!body || typeof body.userId !== 'string') return sendJSON(res, 400, { error: 'Missing userId' });
          const updated = services.projects.removeMember(id, body.userId);
          if (!updated) return sendJSON(res, 404, { error: 'Project not found' });
          return sendJSON(res, 200, updated);
        }
      }

      // Tasks
      if (method === 'GET' && pathname === '/tasks') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return sendJSON(res, 400, { error: 'Missing projectId' });
        const tasks = services.tasks.getByProject(projectId);
        return sendJSON(res, 200, tasks);
      }
      if (method === 'POST' && pathname === '/tasks') {
        const body = await parseBody(req);
        if (!body || typeof body.title !== 'string' || typeof body.projectId !== 'string') {
          return sendJSON(res, 400, { error: 'Missing title or projectId' });
        }
        const task = services.tasks.create({ title: body.title, description: body.description, projectId: body.projectId, assigneeId: body.assigneeId });
        return sendJSON(res, 201, task);
      }
      if (method === 'GET' && pathname.startsWith('/tasks/')) {
        const id = pathname.split('/')[2];
        const task = services.tasks.getById(id);
        if (!task) return sendJSON(res, 404, { error: 'Task not found' });
        return sendJSON(res, 200, task);
      }
      if (method === 'PUT' && pathname.startsWith('/tasks/') && !pathname.endsWith('/status') && !pathname.endsWith('/assign')) {
        const id = pathname.split('/')[2];
        const body = await parseBody(req);
        const updated = services.tasks.update(id, body || {});
        if (!updated) return sendJSON(res, 404, { error: 'Task not found' });
        return sendJSON(res, 200, updated);
      }
      if (method === 'DELETE' && pathname.startsWith('/tasks/')) {
        const id = pathname.split('/')[2];
        const ok = services.tasks.delete(id);
        if (!ok) return sendJSON(res, 404, { error: 'Task not found' });
        return sendJSON(res, 204, {});
      }
      if (method === 'PUT' && pathname.endsWith('/status')) {
        const id = pathname.split('/')[2];
        const body = await parseBody(req);
        const newStatus = body && body.status as TaskStatus | undefined;
        if (!newStatus || !['todo', 'in-progress', 'done'].includes(newStatus)) {
          return sendJSON(res, 400, { error: 'Invalid status' });
        }
        const updated = services.tasks.changeStatus(id, newStatus);
        if (!updated) return sendJSON(res, 400, { error: 'Invalid transition or task not found' });
        return sendJSON(res, 200, updated);
      }
      if (method === 'PUT' && pathname.endsWith('/assign')) {
        const id = pathname.split('/')[2];
        const body = await parseBody(req);
        if (!body || typeof body.assigneeId !== 'string') {
          return sendJSON(res, 400, { error: 'Missing assigneeId' });
        }
        const updated = services.tasks.assign(id, body.assigneeId);
        if (!updated) return sendJSON(res, 404, { error: 'Task not found' });
        return sendJSON(res, 200, updated);
      }

      // Comments
      if (method === 'GET' && pathname === '/comments') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return sendJSON(res, 400, { error: 'Missing taskId' });
        const comments = services.comments.getByTask(taskId);
        return sendJSON(res, 200, comments);
      }
      if (method === 'POST' && pathname === '/comments') {
        const body = await parseBody(req);
        if (!body || typeof body.taskId !== 'string' || typeof body.authorId !== 'string' || typeof body.body !== 'string') {
          return sendJSON(res, 400, { error: 'Missing taskId, authorId, or body' });
        }
        const task = services.tasks.getById(body.taskId);
        const author = services.users.getById(body.authorId);
        const comment = services.comments.create({ taskId: body.taskId, authorId: body.authorId, body: body.body, taskTitle: task?.title, authorName: author?.name, assigneeId: task?.assigneeId });
        return sendJSON(res, 201, comment);
      }
      if (method === 'GET' && pathname.startsWith('/comments/')) {
        const id = pathname.split('/')[2];
        const c = services.comments.getById(id);
        if (!c) return sendJSON(res, 404, { error: 'Comment not found' });
        return sendJSON(res, 200, c);
      }
      if (method === 'DELETE' && pathname.startsWith('/comments/')) {
        const id = pathname.split('/')[2];
        const ok = services.comments.delete(id);
        if (!ok) return sendJSON(res, 404, { error: 'Comment not found' });
        return sendJSON(res, 204, {});
      }

      // Notifications
      if (method === 'GET' && pathname === '/notifications') {
        const userId = url.searchParams.get('userId');
        if (!userId) return sendJSON(res, 400, { error: 'Missing userId' });
        const notifs = services.notifications.getByUser(userId);
        return sendJSON(res, 200, notifs);
      }
      if (method === 'PUT' && pathname.startsWith('/notifications/') && pathname.endsWith('/read')) {
        const id = pathname.split('/')[2];
        const updated = services.notifications.markAsRead(id);
        if (!updated) return sendJSON(res, 404, { error: 'Notification not found' });
        return sendJSON(res, 200, updated);
      }

      sendJSON(res, 404, { error: 'Not found' });
    } catch (err: any) {
      sendJSON(res, 400, { error: err?.message || 'Bad request' });
    }
  });
}
