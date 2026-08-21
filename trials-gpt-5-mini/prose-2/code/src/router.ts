import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

function json(res: ServerResponse, status: number, body: any) {
  const s = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(s);
}

function notFound(res: ServerResponse) {
  json(res, 404, { error: 'not found' });
}

export class ApiServer {
  private bus: EventBus;
  private userSvc: UserService;
  private projectSvc: ProjectService;
  private taskSvc: TaskService;
  private commentSvc: CommentService;
  private notificationSvc: NotificationService;

  constructor() {
    this.bus = new EventBus();
    this.userSvc = new UserService();
    this.projectSvc = new ProjectService();
    this.taskSvc = new TaskService(this.bus);
    this.commentSvc = new CommentService(this.bus);
    this.notificationSvc = new NotificationService(this.bus);
  }

  handler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = parseUrl(req.url || '', true);
    const path = url.pathname || '/';
    const method = (req.method || 'GET').toUpperCase();

    // simple body parse
    const body = await new Promise<any>((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        if (!data) return resolve(undefined);
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          resolve(undefined);
        }
      });
    });

    // Routing
    try {
      // Users
      if (path === '/users' && method === 'GET') return json(res, 200, this.userSvc.listUsers());
      if (path === '/users' && method === 'POST') {
        const { name, email } = body || {};
        if (!name || !email) return json(res, 400, { error: 'name and email required' });
        const u = this.userSvc.createUser(name, email);
        return json(res, 201, u);
      }

      const userIdMatch = path.match(/^\/users\/([^/]+)$/);
      if (userIdMatch) {
        const id = userIdMatch[1];
        if (method === 'GET') {
          const u = this.userSvc.getUser(id);
          if (!u) return notFound(res);
          return json(res, 200, u);
        }
        if (method === 'PUT') {
          const updated = this.userSvc.updateUser(id, body || {});
          if (!updated) return notFound(res);
          return json(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.userSvc.deleteUser(id);
          if (!ok) return notFound(res);
          return json(res, 204, '');
        }
      }

      // Projects
      if (path === '/projects' && method === 'GET') return json(res, 200, this.projectSvc.listProjects());
      if (path === '/projects' && method === 'POST') {
        const { name, description } = body || {};
        if (!name) return json(res, 400, { error: 'name required' });
        const p = this.projectSvc.createProject(name, description);
        return json(res, 201, p);
      }

      const projectMatch = path.match(/^\/projects\/([^/]+)$/);
      if (projectMatch) {
        const id = projectMatch[1];
        if (method === 'GET') {
          const p = this.projectSvc.getProject(id);
          if (!p) return notFound(res);
          return json(res, 200, p);
        }
        if (method === 'PUT') {
          const updated = this.projectSvc.updateProject(id, body || {});
          if (!updated) return notFound(res);
          return json(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.projectSvc.deleteProject(id);
          if (!ok) return notFound(res);
          return json(res, 204, '');
        }
      }

      const projectMemberMatch = path.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMemberMatch) {
        const id = projectMemberMatch[1];
        if (method === 'POST') {
          const { userId } = body || {};
          if (!userId) return json(res, 400, { error: 'userId required' });
          const ok = this.projectSvc.addMember(id, userId);
          if (!ok) return notFound(res);
          return json(res, 200, { ok: true });
        }
        if (method === 'DELETE') {
          const { userId } = body || {};
          if (!userId) return json(res, 400, { error: 'userId required' });
          const ok = this.projectSvc.removeMember(id, userId);
          if (!ok) return notFound(res);
          return json(res, 200, { ok: true });
        }
      }

      // Tasks
      if (path === '/tasks' && method === 'GET') {
        const projectId = url.query['projectId'] as string | undefined;
        return json(res, 200, this.taskSvc.listTasks(projectId ? { projectId } : undefined));
      }
      if (path === '/tasks' && method === 'POST') {
        const { title, description, projectId } = body || {};
        if (!title || !projectId) return json(res, 400, { error: 'title and projectId required' });
        const t = this.taskSvc.createTask(title, projectId, description);
        return json(res, 201, t);
      }

      const taskMatch = path.match(/^\/tasks\/([^/]+)$/);
      if (taskMatch) {
        const id = taskMatch[1];
        if (method === 'GET') {
          const t = this.taskSvc.getTask(id);
          if (!t) return notFound(res);
          return json(res, 200, t);
        }
        if (method === 'PUT') {
          const updated = this.taskSvc.updateTask(id, body || {});
          if (!updated) return notFound(res);
          return json(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = this.taskSvc.deleteTask(id);
          if (!ok) return notFound(res);
          return json(res, 204, '');
        }
      }

      const taskStatusMatch = path.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch && method === 'PUT') {
        const id = taskStatusMatch[1];
        const { status } = body || {};
        const r = this.taskSvc.setStatus(id, status);
        if (!r.ok) return json(res, 400, { error: r.reason });
        return json(res, 200, r.task);
      }

      const taskAssignMatch = path.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch && method === 'PUT') {
        const id = taskAssignMatch[1];
        const { userId } = body || {};
        if (!userId) return json(res, 400, { error: 'userId required' });
        const r = this.taskSvc.assign(id, userId);
        if (!r.ok) return json(res, 400, { error: r.reason });
        return json(res, 200, r.task);
      }

      // Comments
      if (path === '/comments' && method === 'GET') {
        const taskId = url.query['taskId'] as string | undefined;
        return json(res, 200, this.commentSvc.listComments(taskId ? { taskId } : undefined));
      }
      if (path === '/comments' && method === 'POST') {
        const { taskId, authorId, body: text } = body || {};
        if (!taskId || !authorId || !text) return json(res, 400, { error: 'taskId, authorId, body required' });
        // To allow notification service to notify task assignee, attach task snapshot
        const task = this.taskSvc.getTask(taskId);
        const comment = this.commentSvc.addComment(taskId, authorId, text);
        this.bus.publish('comment.added', { comment, task });
        return json(res, 201, comment);
      }

      const commentMatch = path.match(/^\/comments\/([^/]+)$/);
      if (commentMatch) {
        const id = commentMatch[1];
        if (method === 'GET') {
          const c = this.commentSvc.getComment(id);
          if (!c) return notFound(res);
          return json(res, 200, c);
        }
        if (method === 'DELETE') {
          const ok = this.commentSvc.deleteComment(id);
          if (!ok) return notFound(res);
          return json(res, 204, '');
        }
      }

      // Notifications
      if (path === '/notifications' && method === 'GET') {
        const userId = url.query['userId'] as string | undefined;
        return json(res, 200, this.notificationSvc.listNotifications(userId ? { userId } : undefined));
      }

      const notificationMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
      if (notificationMatch && method === 'PUT') {
        const id = notificationMatch[1];
        const ok = this.notificationSvc.markRead(id);
        if (!ok) return notFound(res);
        return json(res, 200, { ok: true });
      }

      // nothing matched
      notFound(res);
    } catch (err: any) {
      console.error('handler error', err);
      json(res, 500, { error: 'internal' });
    }
  };

  createServer(port = 3000) {
    const srv = createServer(this.handler);
    srv.listen(port);
    return srv;
  }
}
