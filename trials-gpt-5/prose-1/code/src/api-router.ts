import { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export interface Services {
  users: UserService;
  projects: ProjectService;
  tasks: TaskService;
  comments: CommentService;
  notifications: NotificationService;
}

async function readJsonBody<T = any>(req: IncomingMessage): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const str = Buffer.concat(chunks).toString('utf8');
      if (!str) return resolve(undefined);
      try {
        const obj = JSON.parse(str);
        resolve(obj);
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, status: number, data: any): void {
  const body = JSON.stringify(data);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

function notFound(res: ServerResponse): void {
  sendJson(res, 404, { error: 'Not Found' });
}

function badRequest(res: ServerResponse, msg = 'Bad Request'): void {
  sendJson(res, 400, { error: msg });
}

export function createApiRouter(services: Services) {
  return async function handler(req: IncomingMessage, res: ServerResponse) {
    const method = (req.method || 'GET').toUpperCase();
    const url = parseUrl(req.url || '', true);
    const path = url.pathname || '/';

    try {
      // Users
      if (path === '/users' && method === 'GET') {
        return sendJson(res, 200, services.users.list());
      }
      if (path === '/users' && method === 'POST') {
        const body = await readJsonBody(req);
        if (!body || typeof body.name !== 'string' || typeof body.email !== 'string') {
          return badRequest(res, 'name and email are required');
        }
        const user = services.users.create(body.name, body.email);
        return sendJson(res, 201, user);
      }
      const userIdMatch = path.match(/^\/users\/([^/]+)$/);
      if (userIdMatch) {
        const id = userIdMatch[1];
        if (method === 'GET') {
          const u = services.users.get(id);
          return u ? sendJson(res, 200, u) : notFound(res);
        }
        if (method === 'PUT') {
          const body = await readJsonBody(req);
          if (!body) return badRequest(res);
          const u = services.users.update(id, { name: body.name, email: body.email });
          return u ? sendJson(res, 200, u) : notFound(res);
        }
        if (method === 'DELETE') {
          const ok = services.users.delete(id);
          return ok ? sendJson(res, 204, {}) : notFound(res);
        }
      }

      // Projects
      if (path === '/projects' && method === 'GET') {
        return sendJson(res, 200, services.projects.list());
      }
      if (path === '/projects' && method === 'POST') {
        const body = await readJsonBody(req);
        if (!body || typeof body.name !== 'string' || typeof body.description !== 'string') {
          return badRequest(res, 'name and description are required');
        }
        const project = services.projects.create(body.name, body.description);
        return sendJson(res, 201, project);
      }
      const projectIdMatch = path.match(/^\/projects\/([^/]+)$/);
      if (projectIdMatch) {
        const id = projectIdMatch[1];
        if (method === 'GET') {
          const p = services.projects.get(id);
          return p ? sendJson(res, 200, p) : notFound(res);
        }
        if (method === 'PUT') {
          const body = await readJsonBody(req);
          if (!body) return badRequest(res);
          const p = services.projects.update(id, { name: body.name, description: body.description });
          return p ? sendJson(res, 200, p) : notFound(res);
        }
        if (method === 'DELETE') {
          const ok = services.projects.delete(id);
          return ok ? sendJson(res, 204, {}) : notFound(res);
        }
      }
      const projectMembersMatch = path.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMembersMatch) {
        const id = projectMembersMatch[1];
        if (method === 'POST') {
          const body = await readJsonBody(req);
          if (!body || typeof body.userId !== 'string') return badRequest(res, 'userId required');
          const p = services.projects.addMember(id, body.userId);
          return p ? sendJson(res, 200, p) : notFound(res);
        }
        if (method === 'DELETE') {
          const body = await readJsonBody(req);
          if (!body || typeof body.userId !== 'string') return badRequest(res, 'userId required');
          const p = services.projects.removeMember(id, body.userId);
          return p ? sendJson(res, 200, p) : notFound(res);
        }
      }

      // Tasks
      if (path === '/tasks' && method === 'GET') {
        const projectId = typeof url.query.projectId === 'string' ? url.query.projectId : undefined;
        return sendJson(res, 200, services.tasks.list({ projectId }));
      }
      if (path === '/tasks' && method === 'POST') {
        const body = await readJsonBody(req);
        if (!body || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.projectId !== 'string') {
          return badRequest(res, 'title, description, and projectId are required');
        }
        const task = services.tasks.create(body.title, body.description, body.projectId, body.assignee);
        return sendJson(res, 201, task);
      }
      const taskIdMatch = path.match(/^\/tasks\/([^/]+)$/);
      if (taskIdMatch) {
        const id = taskIdMatch[1];
        if (method === 'GET') {
          const t = services.tasks.get(id);
          return t ? sendJson(res, 200, t) : notFound(res);
        }
        if (method === 'PUT') {
          const body = await readJsonBody(req);
          if (!body) return badRequest(res);
          const t = services.tasks.update(id, { title: body.title, description: body.description, assignee: body.assignee });
          return t ? sendJson(res, 200, t) : notFound(res);
        }
        if (method === 'DELETE') {
          const ok = services.tasks.delete(id);
          return ok ? sendJson(res, 204, {}) : notFound(res);
        }
      }
      const taskStatusMatch = path.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch && method === 'PUT') {
        const id = taskStatusMatch[1];
        const body = await readJsonBody(req);
        if (!body || typeof body.status !== 'string') return badRequest(res, 'status required');
        const t = services.tasks.setStatus(id, body.status);
        if (!t) return badRequest(res, 'invalid status transition or task not found');
        return sendJson(res, 200, t);
      }
      const taskAssignMatch = path.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch && method === 'PUT') {
        const id = taskAssignMatch[1];
        const body = await readJsonBody(req);
        if (!body || typeof body.assignee !== 'string') return badRequest(res, 'assignee required');
        const t = services.tasks.assign(id, body.assignee);
        return t ? sendJson(res, 200, t) : notFound(res);
      }

      // Comments
      if (path === '/comments' && method === 'GET') {
        const taskId = typeof url.query.taskId === 'string' ? url.query.taskId : undefined;
        return sendJson(res, 200, services.comments.list({ taskId }));
      }
      if (path === '/comments' && method === 'POST') {
        const body = await readJsonBody(req);
        if (!body || typeof body.taskId !== 'string' || typeof body.authorId !== 'string' || typeof body.body !== 'string') {
          return badRequest(res, 'taskId, authorId and body are required');
        }
        const c = services.comments.create(body.taskId, body.authorId, body.body);
        return sendJson(res, 201, c);
      }
      const commentIdMatch = path.match(/^\/comments\/([^/]+)$/);
      if (commentIdMatch) {
        const id = commentIdMatch[1];
        if (method === 'GET') {
          const c = services.comments.get(id);
          return c ? sendJson(res, 200, c) : notFound(res);
        }
        if (method === 'DELETE') {
          const ok = services.comments.delete(id);
          return ok ? sendJson(res, 204, {}) : notFound(res);
        }
      }

      // Notifications
      if (path === '/notifications' && method === 'GET') {
        const userId = typeof url.query.userId === 'string' ? url.query.userId : undefined;
        return sendJson(res, 200, services.notifications.list({ userId }));
      }
      const notifReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
      if (notifReadMatch && method === 'PUT') {
        const id = notifReadMatch[1];
        const n = services.notifications.markRead(id);
        return n ? sendJson(res, 200, n) : notFound(res);
      }

      // Default
      notFound(res);
    } catch (err: any) {
      sendJson(res, 500, { error: err?.message || 'Internal Server Error' });
    }
  };
}
