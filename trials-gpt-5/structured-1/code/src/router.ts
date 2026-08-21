import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function send(res: ServerResponse, status: number, data?: any) {
  const payload = data === undefined ? '' : JSON.stringify(data);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(payload);
}

export function createApiServer(
  userSvc: UserService,
  projectSvc: ProjectService,
  taskSvc: TaskService,
  commentSvc: CommentService,
  notifSvc: NotificationService,
): http.Server {
  const server = http.createServer(async (req, res) => {
    if (!req.url || !req.method) return send(res, 404, { error: 'Not found' });

    // CORS for convenience in demos
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return send(res, 200, {});

    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const method = req.method.toUpperCase();

    try {
      // Users
      if (method === 'GET' && pathname === '/users') {
        return send(res, 200, userSvc.getAll());
      }
      if (method === 'POST' && pathname === '/users') {
        const body = await parseBody(req);
        if (!body || !body.name || !body.email) return send(res, 400, { error: 'name and email required' });
        const user = userSvc.create({ name: body.name, email: body.email });
        return send(res, 201, user);
      }
      if (parts[0] === 'users' && parts.length === 2) {
        const id = parts[1];
        if (method === 'GET') {
          const user = userSvc.getById(id);
          return user ? send(res, 200, user) : send(res, 404, { error: 'User not found' });
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = userSvc.update(id, { name: body?.name, email: body?.email });
          return updated ? send(res, 200, updated) : send(res, 404, { error: 'User not found' });
        }
        if (method === 'DELETE') {
          const ok = userSvc.delete(id);
          return ok ? send(res, 204) : send(res, 404, { error: 'User not found' });
        }
      }

      // Projects
      if (method === 'GET' && pathname === '/projects') {
        return send(res, 200, projectSvc.getAll());
      }
      if (method === 'POST' && pathname === '/projects') {
        const body = await parseBody(req);
        if (!body || !body.name) return send(res, 400, { error: 'name required' });
        const project = projectSvc.create({ name: body.name, description: body.description, memberIds: body.memberIds });
        return send(res, 201, project);
      }
      if (parts[0] === 'projects' && parts.length === 2) {
        const id = parts[1];
        if (method === 'GET') {
          const p = projectSvc.getById(id);
          return p ? send(res, 200, p) : send(res, 404, { error: 'Project not found' });
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const updated = projectSvc.update(id, {
            name: body?.name,
            description: body?.description,
            memberIds: body?.memberIds,
          });
          return updated ? send(res, 200, updated) : send(res, 404, { error: 'Project not found' });
        }
        if (method === 'DELETE') {
          const ok = projectSvc.delete(id);
          return ok ? send(res, 204) : send(res, 404, { error: 'Project not found' });
        }
      }
      if (parts[0] === 'projects' && parts.length === 3 && parts[2] === 'members') {
        const id = parts[1];
        const body = await parseBody(req);
        if (!body || !body.userId) return send(res, 400, { error: 'userId required' });
        if (method === 'POST') {
          const p = projectSvc.addMember(id, body.userId);
          return p ? send(res, 200, p) : send(res, 404, { error: 'Project not found' });
        }
        if (method === 'DELETE') {
          const p = projectSvc.removeMember(id, body.userId);
          return p ? send(res, 200, p) : send(res, 404, { error: 'Project not found' });
        }
      }

      // Tasks
      if (method === 'GET' && parts[0] === 'tasks' && parts.length === 1) {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return send(res, 400, { error: 'projectId query required' });
        return send(res, 200, taskSvc.getByProject(projectId));
      }
      if (method === 'POST' && pathname === '/tasks') {
        const body = await parseBody(req);
        if (!body || !body.title || !body.projectId) return send(res, 400, { error: 'title and projectId required' });
        const t = taskSvc.create({ title: body.title, description: body.description, projectId: body.projectId });
        return send(res, 201, t);
      }
      if (parts[0] === 'tasks' && parts.length === 2) {
        const id = parts[1];
        if (method === 'GET') {
          const t = taskSvc.getById(id);
          return t ? send(res, 200, t) : send(res, 404, { error: 'Task not found' });
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          // Allow updating title/description only via generic update
          const t = taskSvc.update(id, { title: body?.title, description: body?.description });
          return t ? send(res, 200, t) : send(res, 404, { error: 'Task not found' });
        }
        if (method === 'DELETE') {
          const ok = taskSvc.delete(id);
          return ok ? send(res, 204) : send(res, 404, { error: 'Task not found' });
        }
      }
      if (parts[0] === 'tasks' && parts.length === 3 && parts[2] === 'assign' && method === 'PUT') {
        const id = parts[1];
        const body = await parseBody(req);
        if (!body || !body.assigneeId) return send(res, 400, { error: 'assigneeId required' });
        const t = taskSvc.assign(id, body.assigneeId);
        return t ? send(res, 200, t) : send(res, 404, { error: 'Task not found' });
      }
      if (parts[0] === 'tasks' && parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
        const id = parts[1];
        const body = await parseBody(req);
        const status = body?.status as TaskStatus | undefined;
        if (!status) return send(res, 400, { error: 'status required' });
        const t = taskSvc.changeStatus(id, status);
        return t ? send(res, 200, t) : send(res, 404, { error: 'Task not found or invalid status transition' });
      }

      // Comments
      if (method === 'GET' && parts[0] === 'comments' && parts.length === 1) {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return send(res, 400, { error: 'taskId query required' });
        return send(res, 200, commentSvc.getByTask(taskId));
      }
      if (method === 'POST' && pathname === '/comments') {
        const body = await parseBody(req);
        if (!body || !body.taskId || !body.authorId || !body.body) return send(res, 400, { error: 'taskId, authorId, body required' });
        const c = commentSvc.create({ taskId: body.taskId, authorId: body.authorId, body: body.body });
        return send(res, 201, c);
      }
      if (parts[0] === 'comments' && parts.length === 2) {
        const id = parts[1];
        if (method === 'GET') {
          const c = commentSvc.getById(id);
          return c ? send(res, 200, c) : send(res, 404, { error: 'Comment not found' });
        }
        if (method === 'DELETE') {
          const ok = commentSvc.delete(id);
          return ok ? send(res, 204) : send(res, 404, { error: 'Comment not found' });
        }
      }

      // Notifications
      if (method === 'GET' && parts[0] === 'notifications' && parts.length === 1) {
        const userId = url.searchParams.get('userId');
        if (!userId) return send(res, 400, { error: 'userId query required' });
        return send(res, 200, notifSvc.getByUser(userId));
      }
      if (method === 'PUT' && parts[0] === 'notifications' && parts.length === 3 && parts[2] === 'read') {
        const id = parts[1];
        const n = notifSvc.markAsRead(id);
        return n ? send(res, 200, n) : send(res, 404, { error: 'Notification not found' });
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err: any) {
      return send(res, 400, { error: err?.message || 'Bad request' });
    }
  });

  return server;
}
