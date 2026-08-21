import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { UserService, User } from './services/user-service';
import { ProjectService, Project } from './services/project-service';
import { TaskService, Task, TaskStatus } from './services/task-service';
import { CommentService, Comment } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { EventBus } from './event-bus';

export type Services = {
  userService: UserService;
  projectService: ProjectService;
  taskService: TaskService;
  commentService: CommentService;
  notificationService: NotificationService;
};

function sendJson(res: ServerResponse, status: number, data: any) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString();
      if (!s) return resolve(null);
      try {
        resolve(JSON.parse(s));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function createRouter(services: Services) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const urlObj = parseUrl(req.url || '', true);
      const method = (req.method || 'GET').toUpperCase();
      const path = urlObj.pathname || '/';
      const q = urlObj.query;

      // routing
      // Users
      if (method === 'GET' && path === '/users') {
        return sendJson(res, 200, services.userService.getAll());
      }

      if (method === 'POST' && path === '/users') {
        const body = await readBody(req);
        const user: User = body;
        const created = services.userService.create(user);
        return sendJson(res, 201, created);
      }

      if (path.startsWith('/users/')) {
        const id = path.split('/')[2];
        if (method === 'GET') return sendJson(res, 200, services.userService.getById(id));
        if (method === 'PUT') {
          const body = await readBody(req);
          const updated = services.userService.update(id, body);
          if (!updated) return sendJson(res, 404, { error: 'Not found' });
          return sendJson(res, 200, updated);
        }
        if (method === 'DELETE') {
          services.userService.delete(id);
          return sendJson(res, 204, null);
        }
      }

      // Projects
      if (method === 'GET' && path === '/projects') {
        return sendJson(res, 200, services.projectService.getAll());
      }
      if (method === 'POST' && path === '/projects') {
        const body = await readBody(req);
        const project: Project = { ...body, memberIds: body.memberIds || [] };
        const created = services.projectService.create(project);
        return sendJson(res, 201, created);
      }
      if (path.startsWith('/projects/')) {
        const parts = path.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') return sendJson(res, 200, services.projectService.getById(id));
          if (method === 'PUT') {
            const body = await readBody(req);
            const updated = services.projectService.update(id, body);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            services.projectService.delete(id);
            return sendJson(res, 204, null);
          }
        }
        if (parts.length === 3 && parts[2] === 'members') {
          if (method === 'POST') {
            const body = await readBody(req);
            const { userId } = body || {};
            const updated = services.projectService.addMember(id, userId);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const body = await readBody(req);
            const { userId } = body || {};
            const updated = services.projectService.removeMember(id, userId);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
        }
      }

      // Tasks
      if (path === '/tasks' && method === 'GET') {
        const projectId = Array.isArray(q.projectId) ? q.projectId[0] : (q.projectId as string | undefined);
        if (projectId) return sendJson(res, 200, services.taskService.getByProject(projectId));
        return sendJson(res, 200, services.taskService.getAll());
      }

      if (path === '/tasks' && method === 'POST') {
        const body = await readBody(req);
        const task: Task = body;
        const created = services.taskService.create(task);
        return sendJson(res, 201, created);
      }

      if (path.startsWith('/tasks/')) {
        const parts = path.split('/').filter(Boolean);
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') return sendJson(res, 200, services.taskService.getById(id));
          if (method === 'PUT') {
            const body = await readBody(req);
            const updated = services.taskService.update(id, body);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            services.taskService.delete(id);
            return sendJson(res, 204, null);
          }
        }
        if (parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
          const body = await readBody(req);
          const { status } = body || {};
          try {
            const updated = services.taskService.changeStatus(id, status as TaskStatus);
            if (!updated) return sendJson(res, 404, { error: 'Not found' });
            return sendJson(res, 200, updated);
          } catch (e: any) {
            return sendJson(res, 400, { error: e.message });
          }
        }
        if (parts.length === 3 && parts[2] === 'assign' && method === 'PUT') {
          const body = await readBody(req);
          const { assigneeId } = body || {};
          // ensure user exists? Router can check
          const u = services.userService.getById(assigneeId);
          if (!u) return sendJson(res, 404, { error: 'Assignee not found' });
          const updated = services.taskService.assign(id, assigneeId);
          if (!updated) return sendJson(res, 404, { error: 'Task not found' });
          return sendJson(res, 200, updated);
        }
      }

      // Comments
      if (path === '/comments' && method === 'GET') {
        const taskId = Array.isArray(q.taskId) ? q.taskId[0] : (q.taskId as string | undefined);
        if (!taskId) return sendJson(res, 400, { error: 'taskId required' });
        return sendJson(res, 200, services.commentService.getByTask(taskId));
      }

      if (path === '/comments' && method === 'POST') {
        const body = await readBody(req);
        const comment: Comment = body;
        // lookup task and author to include metadata
        const task = services.taskService.getById(comment.taskId);
        const author = services.userService.getById(comment.authorId);
        const meta = { taskTitle: task?.title, authorName: author?.name, assigneeId: task?.assigneeId ?? undefined };
        const created = services.commentService.create(comment, meta);
        return sendJson(res, 201, created);
      }

      if (path.startsWith('/comments/')) {
        const id = path.split('/')[2];
        if (method === 'GET') return sendJson(res, 200, services.commentService.getById(id));
        if (method === 'DELETE') {
          services.commentService.delete(id);
          return sendJson(res, 204, null);
        }
      }

      // Notifications
      if (path === '/notifications' && method === 'GET') {
        const userId = Array.isArray(q.userId) ? q.userId[0] : (q.userId as string | undefined);
        if (!userId) return sendJson(res, 400, { error: 'userId required' });
        return sendJson(res, 200, services.notificationService.getByUser(userId));
      }

      if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
        const parts = path.split('/').filter(Boolean);
        const id = parts[1];
        const updated = services.notificationService.markAsRead(id);
        if (!updated) return sendJson(res, 404, { error: 'Not found' });
        return sendJson(res, 200, updated);
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (e: any) {
      sendJson(res, 500, { error: e.message });
    }
  });
}
