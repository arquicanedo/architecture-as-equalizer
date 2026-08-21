import http, { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export interface Services {
  userService: UserService;
  projectService: ProjectService;
  taskService: TaskService;
  commentService: CommentService;
  notificationService: NotificationService;
}

function sendJson(res: ServerResponse, status: number, data: any): void {
  const payload = JSON.stringify(data);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(payload));
  res.end(payload);
}

function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return undefined;
  }
}

export function createHttpServer(services: Services): http.Server {
  const server = http.createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = req.url || '/';
    const { pathname, query } = parseUrl(url, true);

    try {
      // Users
      if (method === 'GET' && pathname === '/users') {
        const users = services.userService.getAll();
        return sendJson(res, 200, users);
      }
      if (method === 'POST' && pathname === '/users') {
        const body = await readBody(req);
        if (!body || typeof body.name !== 'string' || typeof body.email !== 'string') {
          return sendJson(res, 400, { error: 'Invalid body' });
        }
        const user = services.userService.create({ name: body.name, email: body.email });
        return sendJson(res, 201, user);
      }
      if (pathname && /^\/users\/.+/.test(pathname)) {
        const id = pathname.split('/')[2];
        if (method === 'GET') {
          const user = services.userService.getById(id);
          if (!user) return sendJson(res, 404, { error: 'Not found' });
          return sendJson(res, 200, user);
        }
        if (method === 'PUT') {
          const body = await readBody(req);
          const updated = services.userService.update(id, body || {});
          if (!updated) return sendJson(res, 404, { error: 'Not found' });
          return sendJson(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = services.userService.delete(id);
          if (!ok) return sendJson(res, 404, { error: 'Not found' });
          return sendNoContent(res);
        }
      }

      // Projects
      if (method === 'GET' && pathname === '/projects') {
        const projects = services.projectService.getAll();
        return sendJson(res, 200, projects);
      }
      if (method === 'POST' && pathname === '/projects') {
        const body = await readBody(req);
        if (!body || typeof body.name !== 'string' || typeof body.description !== 'string') {
          return sendJson(res, 400, { error: 'Invalid body' });
        }
        const project = services.projectService.create({ name: body.name, description: body.description, memberIds: body.memberIds });
        return sendJson(res, 201, project);
      }
      if (pathname && /^\/projects\/.+/.test(pathname)) {
        const parts = pathname.split('/');
        const id = parts[2];
        if (parts.length === 3) {
          if (method === 'GET') {
            const project = services.projectService.getById(id);
            if (!project) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, project);
          }
          if (method === 'PUT') {
            const body = await readBody(req);
            const updated = services.projectService.update(id, body || {});
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const ok = services.projectService.delete(id);
            if (!ok) return sendJson(res, 404, { error: 'Not found' });
            return sendNoContent(res);
          }
        }
        if (parts.length === 4 && parts[3] === 'members') {
          const body = await readBody(req);
          if (!body || typeof body.userId !== 'string') {
            return sendJson(res, 400, { error: 'Invalid body' });
          }
          if (method === 'POST') {
            const updated = services.projectService.addMember(id, body.userId);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const updated = services.projectService.removeMember(id, body.userId);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
        }
      }

      // Tasks
      if (method === 'GET' && pathname === '/tasks') {
        const projectId = (query && (query as any).projectId) as string | undefined;
        if (!projectId) return sendJson(res, 400, { error: 'projectId required' });
        const tasks = services.taskService.getByProject(projectId);
        return sendJson(res, 200, tasks);
      }
      if (method === 'POST' && pathname === '/tasks') {
        const body = await readBody(req);
        if (!body || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.projectId !== 'string') {
          return sendJson(res, 400, { error: 'Invalid body' });
        }
        const task = services.taskService.create({ title: body.title, description: body.description, projectId: body.projectId, status: body.status, assigneeId: body.assigneeId });
        return sendJson(res, 201, task);
      }
      if (pathname && /^\/tasks\/.+/.test(pathname)) {
        const parts = pathname.split('/');
        const id = parts[2];
        if (parts.length === 3) {
          if (method === 'GET') {
            const task = services.taskService.getById(id);
            if (!task) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, task);
          }
          if (method === 'PUT') {
            const body = await readBody(req);
            try {
              const updated = services.taskService.update(id, body || {});
              if (!updated) return sendJson(res, 404, { error: 'Not found' });
              return sendJson(res, 200, updated);
            } catch (e: any) {
              return sendJson(res, 400, { error: e.message || 'Bad Request' });
            }
          }
          if (method === 'DELETE') {
            const ok = services.taskService.delete(id);
            if (!ok) return sendJson(res, 404, { error: 'Not found' });
            return sendNoContent(res);
          }
        }
        if (parts.length === 4 && parts[3] === 'status' && method === 'PUT') {
          const body = await readBody(req);
          const status = body?.status as TaskStatus | undefined;
          if (!status) return sendJson(res, 400, { error: 'status required' });
          try {
            const updated = services.taskService.changeStatus(id, status);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          } catch (e: any) {
            return sendJson(res, 400, { error: e.message || 'Bad Request' });
          }
        }
        if (parts.length === 4 && parts[3] === 'assign' && method === 'PUT') {
          const body = await readBody(req);
          const assigneeId = (body ? body.assigneeId : undefined) as string | null | undefined;
          const updated = services.taskService.assign(id, assigneeId ?? null);
          if (!updated) return sendJson(res, 404, { error: 'Not found' });
          return sendJson(res, 200, updated);
        }
      }

      // Comments
      if (method === 'GET' && pathname === '/comments') {
        const taskId = (query && (query as any).taskId) as string | undefined;
        if (!taskId) return sendJson(res, 400, { error: 'taskId required' });
        const comments = services.commentService.getByTask(taskId);
        return sendJson(res, 200, comments);
      }
      if (method === 'POST' && pathname === '/comments') {
        const body = await readBody(req);
        if (!body || typeof body.taskId !== 'string' || typeof body.authorId !== 'string' || typeof body.body !== 'string') {
          return sendJson(res, 400, { error: 'Invalid body' });
        }
        const comment = services.commentService.create({ taskId: body.taskId, authorId: body.authorId, body: body.body });
        return sendJson(res, 201, comment);
      }
      if (pathname && /^\/comments\/.+/.test(pathname)) {
        const id = pathname.split('/')[2];
        if (method === 'GET') {
          const c = services.commentService.getById(id);
          if (!c) return sendJson(res, 404, { error: 'Not found' });
          return sendJson(res, 200, c);
        }
        if (method === 'DELETE') {
          const ok = services.commentService.delete(id);
          if (!ok) return sendJson(res, 404, { error: 'Not found' });
          return sendNoContent(res);
        }
      }

      // Notifications
      if (method === 'GET' && pathname === '/notifications') {
        const userId = (query && (query as any).userId) as string | undefined;
        if (!userId) return sendJson(res, 400, { error: 'userId required' });
        const notifs = services.notificationService.getByUser(userId);
        return sendJson(res, 200, notifs);
      }
      if (pathname && /^\/notifications\/.+\/read$/.test(pathname) && method === 'PUT') {
        const id = pathname.split('/')[2];
        const updated = services.notificationService.markAsRead(id);
        if (!updated) return sendJson(res, 404, { error: 'Not found' });
        return sendJson(res, 200, updated);
      }

      // Fallback
      sendJson(res, 404, { error: 'Route not found' });
    } catch (err: any) {
      sendJson(res, 500, { error: 'Internal Server Error', details: err?.message });
    }
  });

  return server;
}
