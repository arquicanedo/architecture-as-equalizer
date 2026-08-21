import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export interface APIDependencies {
  userService: UserService;
  projectService: ProjectService;
  taskService: TaskService;
  commentService: CommentService;
  notificationService: NotificationService;
}

function readJson<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({} as any);
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: any): void {
  const json = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(json));
  res.end(json);
}

function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

export function createServer(deps: APIDependencies): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method || 'GET';
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const path = url.pathname;

      // Routing
      if (path === '/users' && method === 'GET') {
        const users = deps.userService.list();
        return sendJson(res, 200, users);
      }
      if (path === '/users' && method === 'POST') {
        const body = await readJson(req);
        const user = deps.userService.create({ name: body.name, email: body.email });
        return sendJson(res, 201, user);
      }
      if (path.startsWith('/users/') ) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const user = deps.userService.get(id);
          if (!user) return sendJson(res, 404, { error: 'User not found' });
          return sendJson(res, 200, user);
        }
        if (method === 'PUT') {
          const body = await readJson(req);
          const updated = deps.userService.update(id, { name: body.name, email: body.email });
          if (!updated) return sendJson(res, 404, { error: 'User not found' });
          return sendJson(res, 200, updated);
        }
        if (method === 'DELETE') {
          const ok = deps.userService.delete(id);
          if (!ok) return sendJson(res, 404, { error: 'User not found' });
          return sendNoContent(res);
        }
      }

      if (path === '/projects' && method === 'GET') {
        const projects = deps.projectService.list();
        return sendJson(res, 200, projects);
      }
      if (path === '/projects' && method === 'POST') {
        const body = await readJson(req);
        const project = deps.projectService.create({ name: body.name, description: body.description });
        return sendJson(res, 201, project);
      }
      if (path.startsWith('/projects/') ) {
        const parts = path.split('/').filter(Boolean); // ['projects', id, 'members'?]
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') {
            const project = deps.projectService.get(id);
            if (!project) return sendJson(res, 404, { error: 'Project not found' });
            return sendJson(res, 200, project);
          }
          if (method === 'PUT') {
            const body = await readJson(req);
            const updated = deps.projectService.update(id, { name: body.name, description: body.description });
            if (!updated) return sendJson(res, 404, { error: 'Project not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const ok = deps.projectService.delete(id);
            if (!ok) return sendJson(res, 404, { error: 'Project not found' });
            return sendNoContent(res);
          }
        } else if (parts.length === 3 && parts[2] === 'members') {
          if (method === 'POST') {
            const body = await readJson(req);
            const updated = deps.projectService.addMember(id, body.userId);
            if (!updated) return sendJson(res, 404, { error: 'Project not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const body = await readJson(req);
            const updated = deps.projectService.removeMember(id, body.userId);
            if (!updated) return sendJson(res, 404, { error: 'Project not found' });
            return sendJson(res, 200, updated);
          }
        }
      }

      if (path === '/tasks' && method === 'GET') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return sendJson(res, 400, { error: 'projectId is required' });
        const tasks = deps.taskService.listByProject(projectId);
        return sendJson(res, 200, tasks);
      }
      if (path === '/tasks' && method === 'POST') {
        const body = await readJson(req);
        const task = deps.taskService.create({ title: body.title, description: body.description, projectId: body.projectId });
        return sendJson(res, 201, task);
      }
      if (path.startsWith('/tasks/')) {
        const parts = path.split('/').filter(Boolean); // ['tasks', id, maybe 'status'/'assign']
        const id = parts[1];
        if (parts.length === 2) {
          if (method === 'GET') {
            const task = deps.taskService.get(id);
            if (!task) return sendJson(res, 404, { error: 'Task not found' });
            return sendJson(res, 200, task);
          }
          if (method === 'PUT') {
            const body = await readJson(req);
            const updated = deps.taskService.update(id, { title: body.title, description: body.description });
            if (!updated) return sendJson(res, 404, { error: 'Task not found' });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const ok = deps.taskService.delete(id);
            if (!ok) return sendJson(res, 404, { error: 'Task not found' });
            return sendNoContent(res);
          }
        } else if (parts.length === 3 && parts[2] === 'status' && method === 'PUT') {
          const body = await readJson(req);
          try {
            const updated = deps.taskService.changeStatus(id, body.status as TaskStatus);
            if (!updated) return sendJson(res, 404, { error: 'Task not found' });
            return sendJson(res, 200, updated);
          } catch (err) {
            return sendJson(res, 400, { error: 'Invalid status transition' });
          }
        } else if (parts.length === 3 && parts[2] === 'assign' && method === 'PUT') {
          const body = await readJson(req);
          const updated = deps.taskService.assign(id, body.assigneeId);
          if (!updated) return sendJson(res, 404, { error: 'Task not found' });
          return sendJson(res, 200, updated);
        }
      }

      if (path === '/comments' && method === 'GET') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) return sendJson(res, 400, { error: 'taskId is required' });
        const comments = deps.commentService.listByTask(taskId);
        return sendJson(res, 200, comments);
      }
      if (path === '/comments' && method === 'POST') {
        const body = await readJson(req);
        const task = deps.taskService.get(body.taskId);
        const user = deps.userService.get(body.authorId);
        const comment = deps.commentService.create(
          { taskId: body.taskId, authorId: body.authorId, body: body.body },
          task?.title,
          user?.name
        );
        return sendJson(res, 201, comment);
      }
      if (path.startsWith('/comments/')) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const c = deps.commentService.get(id);
          if (!c) return sendJson(res, 404, { error: 'Comment not found' });
          return sendJson(res, 200, c);
        }
        if (method === 'DELETE') {
          const ok = deps.commentService.delete(id);
          if (!ok) return sendJson(res, 404, { error: 'Comment not found' });
          return sendNoContent(res);
        }
      }

      if (path === '/notifications' && method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) return sendJson(res, 400, { error: 'userId is required' });
        const notifs = deps.notificationService.listByUser(userId);
        return sendJson(res, 200, notifs);
      }
      if (path.startsWith('/notifications/') && method === 'PUT') {
        const parts = path.split('/').filter(Boolean); // ['notifications', id, 'read']
        if (parts.length === 3 && parts[2] === 'read') {
          const id = parts[1];
          const updated = deps.notificationService.markRead(id);
          if (!updated) return sendJson(res, 404, { error: 'Notification not found' });
          return sendJson(res, 200, updated);
        }
      }

      // Fallback
      sendJson(res, 404, { error: 'Not found' });
    } catch (err: any) {
      if (!res.headersSent) {
        sendJson(res, 500, { error: err?.message || 'Internal Server Error' });
      } else {
        res.end();
      }
    }
  });
  return server;
}
