import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { URL } from 'url';

function json(res: ServerResponse, code: number, data: any) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
}

function notFound(res: ServerResponse) {
  json(res, 404, { error: 'Not found' });
}

function badRequest(res: ServerResponse, msg = 'Bad request') {
  json(res, 400, { error: msg });
}

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const s = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(s));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function start(port: number) {
  const eventBus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService(eventBus);

  const server = createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method ?? 'GET';

      // Users
      if (method === 'GET' && pathname === '/users') {
        return json(res, 200, userService.getAll());
      }
      if (method === 'POST' && pathname === '/users') {
        try {
          const body = await parseBody(req);
          if (!body?.name || !body?.email) return badRequest(res, 'name and email required');
          const u = userService.create({ name: body.name, email: body.email });
          return json(res, 201, u);
        } catch (err) {
          return badRequest(res, 'invalid json');
        }
      }
      if (pathname.startsWith('/users/')) {
        const id = pathname.split('/')[2];
        if (method === 'GET') {
          const u = userService.getById(id);
          if (!u) return notFound(res);
          return json(res, 200, u);
        }
        if (method === 'PUT') {
          try {
            const body = await parseBody(req);
            const updated = userService.update(id, body);
            if (!updated) return notFound(res);
            return json(res, 200, updated);
          } catch (err) {
            return badRequest(res, 'invalid json');
          }
        }
        if (method === 'DELETE') {
          const ok = userService.delete(id);
          return json(res, ok ? 200 : 404, { success: ok });
        }
      }

      // Projects
      if (method === 'GET' && pathname === '/projects') {
        return json(res, 200, projectService.getAll());
      }
      if (method === 'POST' && pathname === '/projects') {
        try {
          const body = await parseBody(req);
          if (!body?.name) return badRequest(res, 'name required');
          const p = projectService.create({ name: body.name, description: body.description, memberIds: body.memberIds });
          return json(res, 201, p);
        } catch (err) {
          return badRequest(res, 'invalid json');
        }
      }
      if (pathname.startsWith('/projects/')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') {
            const p = projectService.getById(id);
            if (!p) return notFound(res);
            return json(res, 200, p);
          }
          if (method === 'PUT') {
            try {
              const body = await parseBody(req);
              const updated = projectService.update(id, body);
              if (!updated) return notFound(res);
              return json(res, 200, updated);
            } catch (err) {
              return badRequest(res, 'invalid json');
            }
          }
          if (method === 'DELETE') {
            const ok = projectService.delete(id);
            return json(res, ok ? 200 : 404, { success: ok });
          }
        }
        if (parts.length === 3 && parts[2] === 'members') {
          if (method === 'POST') {
            try {
              const body = await parseBody(req);
              if (!body?.userId) return badRequest(res, 'userId required');
              const ok = projectService.addMember(id, body.userId);
              return json(res, ok ? 200 : 404, { success: ok });
            } catch (err) {
              return badRequest(res, 'invalid json');
            }
          }
          if (method === 'DELETE') {
            try {
              const body = await parseBody(req);
              if (!body?.userId) return badRequest(res, 'userId required');
              const ok = projectService.removeMember(id, body.userId);
              return json(res, ok ? 200 : 404, { success: ok });
            } catch (err) {
              return badRequest(res, 'invalid json');
            }
          }
        }
      }

      // Tasks
      if (method === 'GET' && pathname === '/tasks') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return badRequest(res, 'projectId query required');
        return json(res, 200, taskService.getByProject(projectId));
      }
      if (method === 'POST' && pathname === '/tasks') {
        try {
          const body = await parseBody(req);
          if (!body?.title || !body?.projectId) return badRequest(res, 'title and projectId required');
          const t = taskService.create({ title: body.title, description: body.description, projectId: body.projectId, assigneeId: body.assigneeId });
          return json(res, 201, t);
        } catch (err) {
          return badRequest(res, 'invalid json');
        }
      }
      if (pathname.startsWith('/tasks/')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') {
            const t = taskService.getById(id);
            if (!t) return notFound(res);
            return json(res, 200, t);
          }
          if (method === 'PUT') {
            try {
              const body = await parseBody(req);
              const updated = taskService.update(id, body);
              if (!updated) return notFound(res);
              return json(res, 200, updated);
            } catch (err) {
              return badRequest(res, 'invalid json');
            }
          }
          if (method === 'DELETE') {
            const ok = taskService.delete(id);
            return json(res, ok ? 200 : 404, { success: ok });
          }
        }
        if (parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
          try {
            const body = await parseBody(req);
            if (!body?.status) return badRequest(res, 'status required');
            const t = taskService.changeStatus(id, body.status);
            if (!t) return badRequest(res, 'invalid status transition or task not found');
            return json(res, 200, t);
          } catch (err) {
            return badRequest(res, 'invalid json');
          }
        }
        if (parts.length === 3 && parts[2] === 'assign' && method === 'PUT') {
          try {
            const body = await parseBody(req);
            if (!('assigneeId' in (body ?? {}))) return badRequest(res, 'assigneeId required (can be null)');
            const t = taskService.assign(id, body.assigneeId ?? null);
            if (!t) return notFound(res);
            return json(res, 200, t);
          } catch (err) {
            return badRequest(res, 'invalid json');
          }
        }
      }

      // Comments
      if (method === 'GET' && pathname === '/comments') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return badRequest(res, 'taskId query required');
        return json(res, 200, commentService.getByTask(taskId));
      }
      if (method === 'POST' && pathname === '/comments') {
        try {
          const body = await parseBody(req);
          if (!body?.taskId || !body?.authorId || !body?.body) return badRequest(res, 'taskId, authorId, body required');
          // enrich with task title and assigneeId if available
          const task = taskService.getById(body.taskId);
          const taskTitle = task?.title ?? '';
          const assigneeId = task?.assigneeId ?? null;
          // find author name
          const author = userService.getById(body.authorId);
          const authorName = author?.name ?? '';
          const c = commentService.create({ taskId: body.taskId, authorId: body.authorId, body: body.body, authorName, taskTitle, assigneeId });
          return json(res, 201, c);
        } catch (err) {
          return badRequest(res, 'invalid json');
        }
      }
      if (pathname.startsWith('/comments/')) {
        const id = pathname.split('/')[2];
        if (method === 'GET') {
          const c = commentService.getById(id);
          if (!c) return notFound(res);
          return json(res, 200, c);
        }
        if (method === 'DELETE') {
          const ok = commentService.delete(id);
          return json(res, ok ? 200 : 404, { success: ok });
        }
      }

      // Notifications
      if (method === 'GET' && pathname === '/notifications') {
        const userId = url.searchParams.get('userId');
        if (!userId) return badRequest(res, 'userId query required');
        return json(res, 200, notificationService.getByUser(userId));
      }
      if (pathname.startsWith('/notifications/')) {
        const parts = pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 3 && parts[2] === 'read' && method === 'PUT') {
          const n = notificationService.markAsRead(id);
          if (!n) return notFound(res);
          return json(res, 200, n);
        }
      }

      notFound(res);
    } catch (err) {
      json(res, 500, { error: 'internal error' });
    }
  });

  return new Promise<{ server: ReturnType<typeof createHttpServer>; port: number }>((resolve, reject) => {
    server.listen(port, () => {
      const addr: any = server.address();
      const p = typeof addr === 'string' ? 0 : addr.port;
      resolve({ server, port: p });
    });
    server.on('error', reject);
  });
}
