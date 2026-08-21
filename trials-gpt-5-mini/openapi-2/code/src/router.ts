import { createServer, IncomingMessage, ServerResponse } from 'http';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { parse } from 'url';

function json(res: ServerResponse, status: number, body: any) {
  const b = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(b);
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => data += chunk);
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export class APIRouter {
  private userSvc = new UserService();
  private projectSvc = new ProjectService();
  private taskSvc = new TaskService();
  private commentSvc = new CommentService();
  private notifSvc = new NotificationService();

  handler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = parse(req.url || '', true);
    const method = req.method || 'GET';

    try {
      // Users
      if (url.pathname === '/users' && method === 'GET') {
        return json(res, 200, this.userSvc.list());
      }
      if (url.pathname === '/users' && method === 'POST') {
        const body = await parseBody(req);
        const u = this.userSvc.create(body);
        return json(res, 201, u);
      }
      const userIdMatch = url.pathname?.match(/^\/users\/([^/]+)$/);
      if (userIdMatch) {
        const id = userIdMatch[1];
        if (method === 'GET') {
          const u = this.userSvc.get(id);
          if (!u) return res.writeHead(404) && res.end();
          return json(res, 200, u);
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const u = this.userSvc.update(id, body);
          if (!u) return res.writeHead(404) && res.end();
          return json(res, 200, u);
        }
        if (method === 'DELETE') {
          const ok = this.userSvc.delete(id);
          if (!ok) return res.writeHead(404) && res.end();
          res.writeHead(204);
          return res.end();
        }
      }

      // Projects
      if (url.pathname === '/projects' && method === 'GET') {
        return json(res, 200, this.projectSvc.list());
      }
      if (url.pathname === '/projects' && method === 'POST') {
        const body = await parseBody(req);
        const p = this.projectSvc.create(body);
        return json(res, 201, p);
      }
      const projectIdMatch = url.pathname?.match(/^\/projects\/([^/]+)$/);
      if (projectIdMatch) {
        const id = projectIdMatch[1];
        if (method === 'GET') {
          const p = this.projectSvc.get(id);
          if (!p) return res.writeHead(404) && res.end();
          return json(res, 200, p);
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const p = this.projectSvc.update(id, body);
          if (!p) return res.writeHead(404) && res.end();
          return json(res, 200, p);
        }
        if (method === 'DELETE') {
          const ok = this.projectSvc.delete(id);
          if (!ok) return res.writeHead(404) && res.end();
          res.writeHead(204);
          return res.end();
        }
      }

      const projectMembersMatch = url.pathname?.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMembersMatch) {
        const id = projectMembersMatch[1];
        if (method === 'POST') {
          const body = await parseBody(req);
          const p = this.projectSvc.addMember(id, body.userId);
          if (!p) return res.writeHead(404) && res.end();
          return json(res, 200, p);
        }
        if (method === 'DELETE') {
          const body = await parseBody(req);
          const p = this.projectSvc.removeMember(id, body.userId);
          if (!p) return res.writeHead(404) && res.end();
          return json(res, 200, p);
        }
      }

      // Tasks
      if (url.pathname === '/tasks' && method === 'GET') {
        const projectId = url.query.projectId as string | undefined;
        if (!projectId) return res.writeHead(400) && res.end();
        return json(res, 200, this.taskSvc.listByProject(projectId));
      }
      if (url.pathname === '/tasks' && method === 'POST') {
        const body = await parseBody(req);
        const t = this.taskSvc.create(body);
        return json(res, 201, t);
      }
      const taskIdMatch = url.pathname?.match(/^\/tasks\/([^/]+)$/);
      if (taskIdMatch) {
        const id = taskIdMatch[1];
        if (method === 'GET') {
          const t = this.taskSvc.get(id);
          if (!t) return res.writeHead(404) && res.end();
          return json(res, 200, t);
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const t = this.taskSvc.update(id, body);
          if (!t) return res.writeHead(404) && res.end();
          return json(res, 200, t);
        }
        if (method === 'DELETE') {
          const ok = this.taskSvc.delete(id);
          if (!ok) return res.writeHead(404) && res.end();
          res.writeHead(204);
          return res.end();
        }
      }

      const taskStatusMatch = url.pathname?.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch && method === 'PUT') {
        const id = taskStatusMatch[1];
        const body = await parseBody(req);
        try {
          const t = this.taskSvc.changeStatus(id, body.status);
          if (!t) return res.writeHead(404) && res.end();
          return json(res, 200, t);
        } catch (e: any) {
          return res.writeHead(400) && res.end(e.message);
        }
      }

      const taskAssignMatch = url.pathname?.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch && method === 'PUT') {
        const id = taskAssignMatch[1];
        const body = await parseBody(req);
        const t = this.taskSvc.assign(id, body.assigneeId);
        if (!t) return res.writeHead(404) && res.end();
        return json(res, 200, t);
      }

      // Comments
      if (url.pathname === '/comments' && method === 'GET') {
        const taskId = url.query.taskId as string | undefined;
        if (!taskId) return res.writeHead(400) && res.end();
        return json(res, 200, this.commentSvc.listByTask(taskId));
      }
      if (url.pathname === '/comments' && method === 'POST') {
        const body = await parseBody(req);
        // need taskTitle and authorName - router must orchestrate between services
        const task = this.taskSvc.get(body.taskId);
        if (!task) return res.writeHead(404) && res.end();
        const author = this.userSvc.get(body.authorId);
        const authorName = author ? author.name : 'Unknown';
        const c = this.commentSvc.create(body, task.title, authorName);
        return json(res, 201, c);
      }
      const commentIdMatch = url.pathname?.match(/^\/comments\/([^/]+)$/);
      if (commentIdMatch) {
        const id = commentIdMatch[1];
        if (method === 'GET') {
          const c = this.commentSvc.get(id);
          if (!c) return res.writeHead(404) && res.end();
          return json(res, 200, c);
        }
        if (method === 'DELETE') {
          const ok = this.commentSvc.delete(id);
          if (!ok) return res.writeHead(404) && res.end();
          res.writeHead(204);
          return res.end();
        }
      }

      // Notifications
      if (url.pathname === '/notifications' && method === 'GET') {
        const userId = url.query.userId as string | undefined;
        if (!userId) return res.writeHead(400) && res.end();
        return json(res, 200, this.notifSvc.listByUser(userId));
      }
      const notifReadMatch = url.pathname?.match(/^\/notifications\/([^/]+)\/read$/);
      if (notifReadMatch && method === 'PUT') {
        const id = notifReadMatch[1];
        const n = this.notifSvc.markRead(id);
        if (!n) return res.writeHead(404) && res.end();
        return json(res, 200, n);
      }

      res.writeHead(404);
      res.end();
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  };

  createServer() {
    return createServer(this.handler);
  }
}
