import http, { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { CreateCommentInput, CreateProjectInput, CreateTaskInput, CreateUserInput, TaskStatus, UpdateProjectInput, UpdateTaskInput, UpdateUserInput, UUID } from './types';

function readJson<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({} as T);
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function send(res: ServerResponse, status: number, body?: any) {
  const payload = body !== undefined ? JSON.stringify(body) : undefined;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(payload);
}

export class ApiRouter {
  private server?: http.Server;
  private eventBus = new EventBus();
  private userService = new UserService();
  private projectService = new ProjectService();
  private taskService = new TaskService(this.eventBus);
  private commentService = new CommentService(
    this.eventBus,
    (taskId: UUID) => this.taskService.get(taskId)?.title,
    (userId: UUID) => this.userService.get(userId)?.name,
  );
  private notificationService = new NotificationService(this.eventBus);

  listen(port: number): http.Server {
    this.server = http.createServer(async (req, res) => {
      const url = parseUrl(req.url || '', true);
      const method = (req.method || 'GET').toUpperCase();
      const path = url.pathname || '/';
      try {
        if (method === 'GET' && path === '/users') return this.handleListUsers(req, res);
        if (method === 'POST' && path === '/users') return this.handleCreateUser(req, res);
        if (path.startsWith('/users/')) return this.handleUserById(req, res, path);

        if (method === 'GET' && path === '/projects') return this.handleListProjects(req, res);
        if (method === 'POST' && path === '/projects') return this.handleCreateProject(req, res);
        if (path.startsWith('/projects/')) return this.handleProjectRoutes(req, res, path);

        if (method === 'GET' && path === '/tasks') return this.handleListTasks(req, res, url.query.projectId as string);
        if (method === 'POST' && path === '/tasks') return this.handleCreateTask(req, res);
        if (path.startsWith('/tasks/')) return this.handleTaskRoutes(req, res, path);

        if (method === 'GET' && path === '/comments') return this.handleListComments(req, res, url.query.taskId as string);
        if (method === 'POST' && path === '/comments') return this.handleCreateComment(req, res);
        if (path.startsWith('/comments/')) return this.handleCommentRoutes(req, res, path);

        if (method === 'GET' && path === '/notifications') return this.handleListNotifications(req, res, url.query.userId as string);
        if (path.startsWith('/notifications/') && method === 'PUT' && path.endsWith('/read')) return this.handleMarkNotificationRead(req, res, path);

        send(res, 404, { error: 'Not found' });
      } catch (err: any) {
        send(res, 500, { error: err?.message || 'Internal error' });
      }
    });
    this.server.listen(port);
    return this.server;
  }

  // Users
  private async handleListUsers(_req: IncomingMessage, res: ServerResponse) {
    const users = this.userService.list();
    send(res, 200, users);
  }
  private async handleCreateUser(req: IncomingMessage, res: ServerResponse) {
    const input = (await readJson<CreateUserInput>(req));
    const user = this.userService.create(input);
    send(res, 201, user);
  }
  private async handleUserById(req: IncomingMessage, res: ServerResponse, path: string) {
    const id = path.split('/')[2];
    if (req.method === 'GET') {
      const user = this.userService.get(id);
      if (!user) return send(res, 404, { error: 'User not found' });
      return send(res, 200, user);
    } else if (req.method === 'PUT') {
      const input = await readJson<UpdateUserInput>(req);
      const user = this.userService.update(id, input);
      if (!user) return send(res, 404, { error: 'User not found' });
      return send(res, 200, user);
    } else if (req.method === 'DELETE') {
      const ok = this.userService.delete(id);
      if (!ok) return send(res, 404, { error: 'User not found' });
      res.statusCode = 204;
      res.end();
      return;
    }
    send(res, 405, { error: 'Method not allowed' });
  }

  // Projects
  private async handleListProjects(_req: IncomingMessage, res: ServerResponse) {
    const projects = this.projectService.list();
    send(res, 200, projects);
  }
  private async handleCreateProject(req: IncomingMessage, res: ServerResponse) {
    const input = await readJson<CreateProjectInput>(req);
    const project = this.projectService.create(input);
    send(res, 201, project);
  }
  private async handleProjectRoutes(req: IncomingMessage, res: ServerResponse, path: string) {
    const parts = path.split('/').filter(Boolean);
    const id = parts[1];
    if (parts.length === 2) {
      if (req.method === 'GET') {
        const project = this.projectService.get(id);
        if (!project) return send(res, 404, { error: 'Project not found' });
        return send(res, 200, project);
      } else if (req.method === 'PUT') {
        const input = await readJson<UpdateProjectInput>(req);
        const project = this.projectService.update(id, input);
        if (!project) return send(res, 404, { error: 'Project not found' });
        return send(res, 200, project);
      } else if (req.method === 'DELETE') {
        const ok = this.projectService.delete(id);
        if (!ok) return send(res, 404, { error: 'Project not found' });
        res.statusCode = 204;
        res.end();
        return;
      }
    } else if (parts.length === 3 && parts[2] === 'members') {
      if (req.method === 'POST') {
        const body = await readJson<{ userId: UUID }>(req);
        const project = this.projectService.addMember(id, body.userId);
        if (!project) return send(res, 404, { error: 'Project not found' });
        return send(res, 200, project);
      } else if (req.method === 'DELETE') {
        const body = await readJson<{ userId: UUID }>(req);
        const project = this.projectService.removeMember(id, body.userId);
        if (!project) return send(res, 404, { error: 'Project not found' });
        return send(res, 200, project);
      }
    }
    send(res, 405, { error: 'Method not allowed' });
  }

  // Tasks
  private async handleListTasks(_req: IncomingMessage, res: ServerResponse, projectId: string) {
    if (!projectId) return send(res, 400, { error: 'projectId is required' });
    const tasks = this.taskService.listByProject(projectId);
    send(res, 200, tasks);
  }
  private async handleCreateTask(req: IncomingMessage, res: ServerResponse) {
    const input = await readJson<CreateTaskInput>(req);
    const task = this.taskService.create(input);
    send(res, 201, task);
  }
  private async handleTaskRoutes(req: IncomingMessage, res: ServerResponse, path: string) {
    const parts = path.split('/').filter(Boolean);
    const id = parts[1];
    if (parts.length === 2) {
      if (req.method === 'GET') {
        const task = this.taskService.get(id);
        if (!task) return send(res, 404, { error: 'Task not found' });
        return send(res, 200, task);
      } else if (req.method === 'PUT') {
        const input = await readJson<UpdateTaskInput>(req);
        const task = this.taskService.update(id, input);
        if (!task) return send(res, 404, { error: 'Task not found' });
        return send(res, 200, task);
      } else if (req.method === 'DELETE') {
        const ok = this.taskService.delete(id);
        if (!ok) return send(res, 404, { error: 'Task not found' });
        res.statusCode = 204;
        res.end();
        return;
      }
    } else if (parts.length === 3 && parts[2] === 'status') {
      if (req.method === 'PUT') {
        const body = await readJson<{ status: TaskStatus }>(req);
        try {
          const task = this.taskService.changeStatus(id, body.status);
          if (!task) return send(res, 404, { error: 'Task not found' });
          return send(res, 200, task);
        } catch (e: any) {
          return send(res, 400, { error: e.message });
        }
      }
    } else if (parts.length === 3 && parts[2] === 'assign') {
      if (req.method === 'PUT') {
        const body = await readJson<{ assigneeId: UUID }>(req);
        const task = this.taskService.assign(id, body.assigneeId);
        if (!task) return send(res, 404, { error: 'Task not found' });
        return send(res, 200, task);
      }
    }
    send(res, 405, { error: 'Method not allowed' });
  }

  // Comments
  private async handleListComments(_req: IncomingMessage, res: ServerResponse, taskId: string) {
    if (!taskId) return send(res, 400, { error: 'taskId is required' });
    const comments = this.commentService.listByTask(taskId);
    send(res, 200, comments);
  }
  private async handleCreateComment(req: IncomingMessage, res: ServerResponse) {
    const input = await readJson<CreateCommentInput>(req);
    const comment = this.commentService.create(input);
    send(res, 201, comment);
  }
  private async handleCommentRoutes(req: IncomingMessage, res: ServerResponse, path: string) {
    const parts = path.split('/').filter(Boolean);
    const id = parts[1];
    if (parts.length === 2) {
      if (req.method === 'GET') {
        const comment = this.commentService.get(id);
        if (!comment) return send(res, 404, { error: 'Comment not found' });
        return send(res, 200, comment);
      } else if (req.method === 'DELETE') {
        const ok = this.commentService.delete(id);
        if (!ok) return send(res, 404, { error: 'Comment not found' });
        res.statusCode = 204;
        res.end();
        return;
      }
    }
    send(res, 405, { error: 'Method not allowed' });
  }

  // Notifications
  private async handleListNotifications(_req: IncomingMessage, res: ServerResponse, userId: string) {
    if (!userId) return send(res, 400, { error: 'userId is required' });
    const notifs = this.notificationService.listByUser(userId);
    send(res, 200, notifs);
  }
  private async handleMarkNotificationRead(_req: IncomingMessage, res: ServerResponse, path: string) {
    const id = path.split('/')[2];
    const notif = this.notificationService.markRead(id);
    if (!notif) return send(res, 404, { error: 'Notification not found' });
    return send(res, 200, notif);
  }
}
