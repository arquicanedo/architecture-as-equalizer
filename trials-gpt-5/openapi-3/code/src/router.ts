import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { EventBus } from './event-bus';
import { UserService, CreateUserInput, UpdateUserInput } from './services/user-service';
import { ProjectService, CreateProjectInput, UpdateProjectInput } from './services/project-service';
import { TaskService, CreateTaskInput, UpdateTaskInput, TaskStatus } from './services/task-service';
import { CommentService, CreateCommentInput } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export class ApiRouter {
  private userService: UserService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private commentService: CommentService;
  private notificationService: NotificationService;

  constructor(bus: EventBus) {
    this.userService = new UserService();
    this.projectService = new ProjectService();
    this.taskService = new TaskService(bus);
    this.commentService = new CommentService(bus);
    this.notificationService = new NotificationService(bus);
  }

  getServices() {
    return {
      users: this.userService,
      projects: this.projectService,
      tasks: this.taskService,
      comments: this.commentService,
      notifications: this.notificationService,
    };
  }

  createServer(port: number) {
    const server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Internal Server Error', message: err?.message || String(err) });
      }
    });
    server.listen(port);
    return server;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    // Helper to parse JSON body
    const parseBody = async <T>(): Promise<T> => {
      return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => {
          if (!data) return resolve({} as any);
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON body'));
          }
        });
      });
    };

    // Routing
    // Users
    if (url.pathname === '/users' && method === 'GET') {
      return this.sendJson(res, 200, this.userService.listUsers());
    }

    if (url.pathname === '/users' && method === 'POST') {
      const body = await parseBody<CreateUserInput>();
      const created = this.userService.createUser(body);
      return this.sendJson(res, 201, created);
    }

    const userIdMatch = url.pathname.match(/^\/users\/(.+)$/);
    if (userIdMatch) {
      const id = userIdMatch[1];
      if (method === 'GET') {
        const user = this.userService.getUser(id);
        if (!user) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, user);
      } else if (method === 'PUT') {
        const body = await parseBody<UpdateUserInput>();
        const updated = this.userService.updateUser(id, body);
        if (!updated) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, updated);
      } else if (method === 'DELETE') {
        const ok = this.userService.deleteUser(id);
        if (!ok) return this.sendStatus(res, 404);
        return this.sendStatus(res, 204);
      }
    }

    // Projects
    if (url.pathname === '/projects' && method === 'GET') {
      return this.sendJson(res, 200, this.projectService.listProjects());
    }
    if (url.pathname === '/projects' && method === 'POST') {
      const body = await parseBody<CreateProjectInput>();
      const created = this.projectService.createProject(body);
      return this.sendJson(res, 201, created);
    }

    const projectMatch = url.pathname.match(/^\/projects\/(.+)$/);
    if (projectMatch && !url.pathname.endsWith('/members')) {
      const id = projectMatch[1];
      if (method === 'GET') {
        const proj = this.projectService.getProject(id);
        if (!proj) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, proj);
      } else if (method === 'PUT') {
        const body = await parseBody<UpdateProjectInput>();
        const updated = this.projectService.updateProject(id, body);
        if (!updated) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, updated);
      } else if (method === 'DELETE') {
        const ok = this.projectService.deleteProject(id);
        if (!ok) return this.sendStatus(res, 404);
        return this.sendStatus(res, 204);
      }
    }

    // Project members
    const projectMembersMatch = url.pathname.match(/^\/projects\/(.+)\/members$/);
    if (projectMembersMatch) {
      const projectId = projectMembersMatch[1];
      if (method === 'POST') {
        const body = await parseBody<{ userId: string }>();
        const updated = this.projectService.addMember(projectId, body.userId);
        if (!updated) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, updated);
      } else if (method === 'DELETE') {
        const body = await parseBody<{ userId: string }>();
        const updated = this.projectService.removeMember(projectId, body.userId);
        if (!updated) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, updated);
      }
    }

    // Tasks list by project
    if (url.pathname === '/tasks' && method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      if (!projectId) return this.sendJson(res, 400, { error: 'projectId is required' });
      return this.sendJson(res, 200, this.taskService.listTasksByProject(projectId));
    }

    if (url.pathname === '/tasks' && method === 'POST') {
      const body = await parseBody<CreateTaskInput>();
      const created = this.taskService.createTask(body);
      return this.sendJson(res, 201, created);
    }

    const taskMatch = url.pathname.match(/^\/tasks\/(.+)$/);
    if (taskMatch && !url.pathname.endsWith('/status') && !url.pathname.endsWith('/assign')) {
      const id = taskMatch[1];
      if (method === 'GET') {
        const task = this.taskService.getTask(id);
        if (!task) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, task);
      } else if (method === 'PUT') {
        const body = await parseBody<UpdateTaskInput>();
        const updated = this.taskService.updateTask(id, body);
        if (!updated) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, updated);
      } else if (method === 'DELETE') {
        const ok = this.taskService.deleteTask(id);
        if (!ok) return this.sendStatus(res, 404);
        return this.sendStatus(res, 204);
      }
    }

    // Task status
    const taskStatusMatch = url.pathname.match(/^\/tasks\/(.+)\/status$/);
    if (taskStatusMatch && method === 'PUT') {
      const id = taskStatusMatch[1];
      const body = await parseBody<{ status: TaskStatus }>();
      try {
        const updated = this.taskService.changeStatus(id, body.status);
        if (!updated) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, updated);
      } catch (e: any) {
        return this.sendJson(res, 400, { error: e?.message || 'Invalid status transition' });
      }
    }

    // Task assign
    const taskAssignMatch = url.pathname.match(/^\/tasks\/(.+)\/assign$/);
    if (taskAssignMatch && method === 'PUT') {
      const id = taskAssignMatch[1];
      const body = await parseBody<{ assigneeId: string }>();
      const updated = this.taskService.assignTask(id, body.assigneeId);
      if (!updated) return this.sendStatus(res, 404);
      return this.sendJson(res, 200, updated);
    }

    // Comments
    if (url.pathname === '/comments' && method === 'GET') {
      const taskId = url.searchParams.get('taskId');
      if (!taskId) return this.sendJson(res, 400, { error: 'taskId is required' });
      return this.sendJson(res, 200, this.commentService.listCommentsByTask(taskId));
    }

    if (url.pathname === '/comments' && method === 'POST') {
      const body = await parseBody<CreateCommentInput>();
      // Enrich event payload with task title and author name if available
      const task = this.taskService.getTask(body.taskId);
      const author = this.userService.getUser(body.authorId);
      const created = this.commentService.createComment(body, {
        taskTitle: task?.title,
        authorName: author?.name,
      });
      return this.sendJson(res, 201, created);
    }

    const commentMatch = url.pathname.match(/^\/comments\/(.+)$/);
    if (commentMatch) {
      const id = commentMatch[1];
      if (method === 'GET') {
        const c = this.commentService.getComment(id);
        if (!c) return this.sendStatus(res, 404);
        return this.sendJson(res, 200, c);
      } else if (method === 'DELETE') {
        const ok = this.commentService.deleteComment(id);
        if (!ok) return this.sendStatus(res, 404);
        return this.sendStatus(res, 204);
      }
    }

    // Notifications
    if (url.pathname === '/notifications' && method === 'GET') {
      const userId = url.searchParams.get('userId');
      if (!userId) return this.sendJson(res, 400, { error: 'userId is required' });
      return this.sendJson(res, 200, this.notificationService.listNotifications(userId));
    }

    const notifMatch = url.pathname.match(/^\/notifications\/(.+)\/read$/);
    if (notifMatch && method === 'PUT') {
      const id = notifMatch[1];
      const updated = this.notificationService.markAsRead(id);
      if (!updated) return this.sendStatus(res, 404);
      return this.sendJson(res, 200, updated);
    }

    // Not found
    this.sendJson(res, 404, { error: 'Not found' });
  }

  private sendJson(res: ServerResponse, status: number, data: any) {
    const payload = JSON.stringify(data);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(payload));
    res.end(payload);
  }

  private sendStatus(res: ServerResponse, status: number) {
    res.statusCode = status;
    res.end();
  }
}
