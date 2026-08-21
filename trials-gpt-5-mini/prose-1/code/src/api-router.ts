import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { EventBus } from './event-bus';

function parseJSON(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve(undefined);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, code: number, payload: any) {
  const s = JSON.stringify(payload);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(s);
}

export function createServerWithServices(port: number, services: {
  eventBus: EventBus;
  users: UserService;
  projects: ProjectService;
  tasks: TaskService;
  comments: CommentService;
  notifications: NotificationService;
}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const parts = url.pathname.split('/').filter(Boolean);
    try {
      if (parts[0] === 'users') {
        if (req.method === 'GET' && parts.length === 1) {
          return sendJSON(res, 200, services.users.listUsers());
        }
        if (req.method === 'POST' && parts.length === 1) {
          const body = await parseJSON(req);
          if (!body?.name || !body?.email) return sendJSON(res, 400, { error: 'name and email required' });
          const u = services.users.createUser(body.name, body.email);
          return sendJSON(res, 201, u);
        }
        if (parts.length === 2) {
          const id = parts[1];
          if (req.method === 'GET') {
            const u = services.users.getUser(id);
            if (!u) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, u);
          }
          if (req.method === 'PUT') {
            const body = await parseJSON(req);
            const u = services.users.updateUser(id, body || {});
            if (!u) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, u);
          }
          if (req.method === 'DELETE') {
            const ok = services.users.deleteUser(id);
            return sendJSON(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          }
        }
      } else if (parts[0] === 'projects') {
        if (req.method === 'GET' && parts.length === 1) {
          return sendJSON(res, 200, services.projects.listProjects());
        }
        if (req.method === 'POST' && parts.length === 1) {
          const body = await parseJSON(req);
          if (!body?.name) return sendJSON(res, 400, { error: 'name required' });
          const p = services.projects.createProject(body.name, body.description);
          return sendJSON(res, 201, p);
        }
        if (parts.length === 2) {
          const id = parts[1];
          if (req.method === 'GET') {
            const p = services.projects.getProject(id);
            if (!p) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, p);
          }
          if (req.method === 'PUT') {
            const body = await parseJSON(req);
            const p = services.projects.updateProject(id, body || {});
            if (!p) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, p);
          }
          if (req.method === 'DELETE') {
            const ok = services.projects.deleteProject(id);
            return sendJSON(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          }
        }
        if (parts.length === 3 && parts[2] === 'members') {
          const id = parts[1];
          if (req.method === 'POST') {
            const body = await parseJSON(req);
            if (!body?.userId) return sendJSON(res, 400, { error: 'userId required' });
            const ok = services.projects.addMember(id, body.userId);
            return sendJSON(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          }
          if (req.method === 'DELETE') {
            const body = await parseJSON(req);
            if (!body?.userId) return sendJSON(res, 400, { error: 'userId required' });
            const ok = services.projects.removeMember(id, body.userId);
            return sendJSON(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          }
        }
      } else if (parts[0] === 'tasks') {
        if (req.method === 'GET' && parts.length === 1) {
          const pid = url.searchParams.get('projectId') || undefined;
          return sendJSON(res, 200, services.tasks.listTasks(pid ? { projectId: pid } : undefined));
        }
        if (req.method === 'POST' && parts.length === 1) {
          const body = await parseJSON(req);
          if (!body?.title || !body?.projectId) return sendJSON(res, 400, { error: 'title and projectId required' });
          const t = services.tasks.createTask(body.title, body.projectId, body.description);
          return sendJSON(res, 201, t);
        }
        if (parts.length === 2) {
          const id = parts[1];
          if (req.method === 'GET') {
            const t = services.tasks.getTask(id);
            if (!t) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, t);
          }
          if (req.method === 'PUT') {
            const body = await parseJSON(req);
            const t = services.tasks.updateTask(id, body || {});
            if (!t) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, t);
          }
          if (req.method === 'DELETE') {
            const ok = services.tasks.deleteTask(id);
            return sendJSON(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          }
        }
        if (parts.length === 3 && parts[2] === 'status' && req.method === 'PUT') {
          const id = parts[1];
          const body = await parseJSON(req);
          if (!body?.status) return sendJSON(res, 400, { error: 'status required' });
          try {
            const t = services.tasks.setStatus(id, body.status);
            if (!t) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, t);
          } catch (err: any) {
            return sendJSON(res, 400, { error: err.message });
          }
        }
        if (parts.length === 3 && parts[2] === 'assign' && req.method === 'PUT') {
          const id = parts[1];
          const body = await parseJSON(req);
          if (!body?.userId) return sendJSON(res, 400, { error: 'userId required' });
          const t = services.tasks.assign(id, body.userId);
          if (!t) return sendJSON(res, 404, { error: 'not found' });
          return sendJSON(res, 200, t);
        }
      } else if (parts[0] === 'comments') {
        if (req.method === 'GET' && parts.length === 1) {
          const tid = url.searchParams.get('taskId') || undefined;
          return sendJSON(res, 200, services.comments.listComments(tid ? { taskId: tid } : undefined));
        }
        if (req.method === 'POST' && parts.length === 1) {
          const body = await parseJSON(req);
          if (!body?.taskId || !body?.authorId || !body?.body) return sendJSON(res, 400, { error: 'taskId, authorId, body required' });
          // To allow NotificationService to notify task assignee, we can enrich event payload by looking up task here and passing it to comment service via event - but services should not call each other. Instead, we provide task info in the event by passing it as optional parameter when calling commentService.addComment? Simpler: after creating comment, also fetch task from tasks service and publish combined payload here.
          const comment = services.comments.addComment(body.taskId, body.authorId, body.body);
          // publish enriched event
          const task = services.tasks.getTask(body.taskId);
          services.eventBus.publish('comment.added', { comment, task });
          return sendJSON(res, 201, comment);
        }
        if (parts.length === 2) {
          const id = parts[1];
          if (req.method === 'GET') {
            const c = services.comments.getComment(id);
            if (!c) return sendJSON(res, 404, { error: 'not found' });
            return sendJSON(res, 200, c);
          }
          if (req.method === 'DELETE') {
            const ok = services.comments.deleteComment(id);
            return sendJSON(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          }
        }
      } else if (parts[0] === 'notifications') {
        if (req.method === 'GET' && parts.length === 1) {
          const uid = url.searchParams.get('userId') || undefined;
          return sendJSON(res, 200, services.notifications.listNotifications(uid ? { userId: uid } : undefined));
        }
        if (parts.length === 3 && parts[2] === 'read' && req.method === 'PUT') {
          const id = parts[1];
          const n = services.notifications.markRead(id);
          if (!n) return sendJSON(res, 404, { error: 'not found' });
          return sendJSON(res, 200, n);
        }
      }

      sendJSON(res, 404, { error: 'not found' });
    } catch (err) {
      console.error(err);
      sendJSON(res, 500, { error: 'internal' });
    }
  });

  return {
    listen: (cb?: () => void) => server.listen(port, cb),
    close: (cb?: () => void) => server.close(cb),
  };
}
