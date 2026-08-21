import http from 'http';
import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';
import { parse } from 'url';

function json(res: http.ServerResponse, status: number, body: any) {
  const s = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(s);
}

function notFound(res: http.ServerResponse) {
  res.statusCode = 404;
  res.end();
}

function badRequest(res: http.ServerResponse, msg: string) {
  res.statusCode = 400;
  res.end(msg);
}

export function createServer() {
  const server = http.createServer(async (req, res) => {
    const urlObj = parse(req.url || '', true);
    const method = req.method || 'GET';
    const path = urlObj.pathname || '/';

    // helper to read body
    const body = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
    });

    try {
      // Users
      if (path === '/users' && method === 'GET') {
        return json(res, 200, userService.list());
      }
      if (path === '/users' && method === 'POST') {
        const input = JSON.parse(body || '{}');
        const u = userService.create(input);
        res.setHeader('Location', `/users/${u.id}`);
        return json(res, 201, u);
      }
      const userIdMatch = path.match(/^\/users\/(.+)$/);
      if (userIdMatch) {
        const id = userIdMatch[1];
        if (method === 'GET') {
          const u = userService.get(id);
          if (!u) return notFound(res);
          return json(res, 200, u);
        }
        if (method === 'PUT') {
          const input = JSON.parse(body || '{}');
          const u = userService.update(id, input);
          if (!u) return notFound(res);
          return json(res, 200, u);
        }
        if (method === 'DELETE') {
          const ok = userService.delete(id);
          if (!ok) return notFound(res);
          res.statusCode = 204;
          return res.end();
        }
      }

      // Projects
      if (path === '/projects' && method === 'GET') {
        return json(res, 200, projectService.list());
      }
      if (path === '/projects' && method === 'POST') {
        const input = JSON.parse(body || '{}');
        const p = projectService.create(input);
        res.setHeader('Location', `/projects/${p.id}`);
        return json(res, 201, p);
      }
      const projectMatch = path.match(/^\/projects\/(.+)\/members$/);
      if (projectMatch) {
        const id = projectMatch[1];
        if (method === 'POST') {
          const input = JSON.parse(body || '{}');
          const p = projectService.addMember(id, input.userId);
          if (!p) return notFound(res);
          return json(res, 200, p);
        }
        if (method === 'DELETE') {
          const input = JSON.parse(body || '{}');
          const p = projectService.removeMember(id, input.userId);
          if (!p) return notFound(res);
          return json(res, 200, p);
        }
      }
      const projectIdMatch = path.match(/^\/projects\/(.+)$/);
      if (projectIdMatch) {
        const id = projectIdMatch[1];
        if (method === 'GET') {
          const p = projectService.get(id);
          if (!p) return notFound(res);
          return json(res, 200, p);
        }
        if (method === 'PUT') {
          const input = JSON.parse(body || '{}');
          const p = projectService.update(id, input);
          if (!p) return notFound(res);
          return json(res, 200, p);
        }
        if (method === 'DELETE') {
          const ok = projectService.delete(id);
          if (!ok) return notFound(res);
          res.statusCode = 204;
          return res.end();
        }
      }

      // Tasks
      if (path === '/tasks' && method === 'GET') {
        const q = urlObj.query as any;
        if (!q.projectId) return badRequest(res, 'projectId required');
        return json(res, 200, taskService.listByProject(q.projectId as string));
      }
      if (path === '/tasks' && method === 'POST') {
        const input = JSON.parse(body || '{}');
        const t = taskService.create(input);
        res.setHeader('Location', `/tasks/${t.id}`);
        return json(res, 201, t);
      }
      const taskIdMatch = path.match(/^\/tasks\/(.+)\/status$/);
      if (taskIdMatch && method === 'PUT') {
        const id = taskIdMatch[1];
        const input = JSON.parse(body || '{}');
        const r = taskService.changeStatus(id, input.status);
        if (r === null) return notFound(res);
        if (r instanceof Error) return badRequest(res, r.message);
        return json(res, 200, r);
      }
      const taskAssignMatch = path.match(/^\/tasks\/(.+)\/assign$/);
      if (taskAssignMatch && method === 'PUT') {
        const id = taskAssignMatch[1];
        const input = JSON.parse(body || '{}');
        const t = taskService.assign(id, input.assigneeId);
        if (!t) return notFound(res);
        return json(res, 200, t);
      }
      const taskMatch = path.match(/^\/tasks\/(.+)$/);
      if (taskMatch) {
        const id = taskMatch[1];
        if (method === 'GET') {
          const t = taskService.get(id);
          if (!t) return notFound(res);
          return json(res, 200, t);
        }
        if (method === 'PUT') {
          const input = JSON.parse(body || '{}');
          const t = taskService.update(id, input);
          if (!t) return notFound(res);
          return json(res, 200, t);
        }
        if (method === 'DELETE') {
          const ok = taskService.delete(id);
          if (!ok) return notFound(res);
          res.statusCode = 204;
          return res.end();
        }
      }

      // Comments
      if (path === '/comments' && method === 'GET') {
        const q = urlObj.query as any;
        if (!q.taskId) return badRequest(res, 'taskId required');
        return json(res, 200, commentService.listByTask(q.taskId as string));
      }
      if (path === '/comments' && method === 'POST') {
        const input = JSON.parse(body || '{}');
        const comment = commentService.create(input);
        res.setHeader('Location', `/comments/${comment.id}`);
        return json(res, 201, comment);
      }
      const commentMatch = path.match(/^\/comments\/(.+)$/);
      if (commentMatch) {
        const id = commentMatch[1];
        if (method === 'GET') {
          const c = commentService.get(id);
          if (!c) return notFound(res);
          return json(res, 200, c);
        }
        if (method === 'DELETE') {
          const ok = commentService.delete(id);
          if (!ok) return notFound(res);
          res.statusCode = 204;
          return res.end();
        }
      }

      // Notifications
      if (path === '/notifications' && method === 'GET') {
        const q = urlObj.query as any;
        if (!q.userId) return badRequest(res, 'userId required');
        return json(res, 200, notificationService.listForUser(q.userId as string));
      }
      const notifMatch = path.match(/^\/notifications\/(.+)\/read$/);
      if (notifMatch && method === 'PUT') {
        const id = notifMatch[1];
        const n = notificationService.markRead(id);
        if (!n) return notFound(res);
        return json(res, 200, n);
      }

      res.statusCode = 404;
      res.end('not found');
    } catch (err: any) {
      console.error(err);
      res.statusCode = 500;
      res.end('internal error');
    }
  });
  return server;
}
