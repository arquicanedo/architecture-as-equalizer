import * as http from 'node:http';
import * as url from 'node:url';

import {
  IUserService,
  IProjectService,
  ITaskService,
  ICommentService,
  INotificationService,
  TaskStatus,
} from './types';

interface Route {
  method: string;
  path: RegExp;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>) => Promise<void>;
}

export class ApiRouter {
  private userService: IUserService;
  private projectService: IProjectService;
  private taskService: ITaskService;
  private commentService: ICommentService;
  private notificationService: INotificationService;
  private routes: Route[];

  constructor(
    userService: IUserService,
    projectService: IProjectService,
    taskService: ITaskService,
    commentService: ICommentService,
    notificationService: INotificationService
  ) {
    this.userService = userService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.commentService = commentService;
    this.notificationService = notificationService;
    this.routes = this.initializeRoutes();
  }

  private async parseJsonBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: string | Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        if (body) {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error('Invalid JSON'));
          }
        } else {
          resolve({});
        }
      });
      req.on('error', (err: Error) => reject(err));
    });
  }

  private sendJsonResponse(res: http.ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private sendErrorResponse(res: http.ServerResponse, statusCode: number, message: string): void {
    this.sendJsonResponse(res, statusCode, { error: message });
  }

  private initializeRoutes(): Route[] {
    return [
      // Users
      { method: 'GET', path: /^\/users$/, handler: this.handleGetUsers },
      { method: 'POST', path: /^\/users$/, handler: this.handleCreateUser },
      { method: 'GET', path: /^\/users\/([a-f0-9-]+)$/, handler: this.handleGetUserById },
      { method: 'PUT', path: /^\/users\/([a-f0-9-]+)$/, handler: this.handleUpdateUser },
      { method: 'DELETE', path: /^\/users\/([a-f0-9-]+)$/, handler: this.handleDeleteUser },

      // Projects
      { method: 'GET', path: /^\/projects$/, handler: this.handleGetProjects },
      { method: 'POST', path: /^\/projects$/, handler: this.handleCreateProject },
      { method: 'GET', path: /^\/projects\/([a-f0-9-]+)$/, handler: this.handleGetProjectById },
      { method: 'PUT', path: /^\/projects\/([a-f0-9-]+)$/, handler: this.handleUpdateProject },
      { method: 'DELETE', path: /^\/projects\/([a-f0-9-]+)$/, handler: this.handleDeleteProject },
      { method: 'POST', path: /^\/projects\/([a-f0-9-]+)\/members$/, handler: this.handleAddProjectMember },
      { method: 'DELETE', path: /^\/projects\/([a-f0-9-]+)\/members$/, handler: this.handleRemoveProjectMember },

      // Tasks
      { method: 'GET', path: /^\/tasks$/, handler: this.handleGetTasks },
      { method: 'POST', path: /^\/tasks$/, handler: this.handleCreateTask },
      { method: 'GET', path: /^\/tasks\/([a-f0-9-]+)$/, handler: this.handleGetTaskById },
      { method: 'PUT', path: /^\/tasks\/([a-f0-9-]+)$/, handler: this.handleUpdateTask },
      { method: 'DELETE', path: /^\/tasks\/([a-f0-9-]+)$/, handler: this.handleDeleteTask },
      { method: 'PUT', path: /^\/tasks\/([a-f0-9-]+)\/status$/, handler: this.handleChangeTaskStatus },
      { method: 'PUT', path: /^\/tasks\/([a-f0-9-]+)\/assign$/, handler: this.handleAssignTask },

      // Comments
      { method: 'GET', path: /^\/comments$/, handler: this.handleGetComments },
      { method: 'POST', path: /^\/comments$/, handler: this.handleCreateComment },
      { method: 'GET', path: /^\/comments\/([a-f0-9-]+)$/, handler: this.handleGetCommentById },
      { method: 'DELETE', path: /^\/comments\/([a-f0-9-]+)$/, handler: this.handleDeleteComment },

      // Notifications
      { method: 'GET', path: /^\/notifications$/, handler: this.handleGetNotifications },
      { method: 'PUT', path: /^\/notifications\/([a-f0-9-]+)\/read$/, handler: this.handleMarkNotificationAsRead },
    ].map(route => ({ ...route, handler: route.handler.bind(this) })); // Bind 'this' to handlers
  }

  public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const path = parsedUrl.pathname || '';
    const method = req.method || '';
    const query = parsedUrl.query as Record<string, string>;

    for (const route of this.routes) {
      if (route.method === method) {
        const match = path.match(route.path);
        if (match) {
          const params: Record<string, string> = {};
          // Extract named parameters from regex capture groups
          // For simplicity, assuming ordered params matching spec-defined paths
          if (match[1]) params.id = match[1]; // First capture group for :id
          
          // The specific params for project members, tasks, comments, notifications
          // will derive from the `id` for simplicity if only one param is in the path.
          // For instance, for /projects/:id/members, params.id will correctly be projectId.
          // This is a simplification; a more robust router would map named groups.
          if (path.includes('/members') && params.id) {
            params.projectId = params.id;
            delete params.id; // Clear generic ID if more specific one is used
          }
          if (path.includes('/tasks/') && params.id) {
            params.taskId = params.id;
            delete params.id;
          }
          if (path.includes('/comments/') && params.id) {
            params.commentId = params.id;
            delete params.id;
          }
          if (path.includes('/notifications/') && params.id) {
            params.notificationId = params.id;
            delete params.id;
          }

          try {
            await route.handler(req, res, params, query);
          } catch (error: any) {
            console.error('Request handler error:', error);
            this.sendErrorResponse(res, 500, error.message || 'Internal Server Error');
          }
          return;
        }
      }
    }

    this.sendErrorResponse(res, 404, 'Not Found');
  }

  // --- User Handlers ---
  private async handleGetUsers(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    const users = this.userService.getAll();
    this.sendJsonResponse(res, 200, users);
  }

  private async handleCreateUser(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.name || !body.email) {
        this.sendErrorResponse(res, 400, 'Name and email are required');
        return;
      }
      const user = this.userService.create({ name: body.name, email: body.email });
      this.sendJsonResponse(res, 201, user);
    } catch (error: any) {
      this.sendErrorResponse(res, 400, error.message);
    }
  }

  private async handleGetUserById(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const user = this.userService.getById(params.id);
      this.sendJsonResponse(res, 200, user);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleUpdateUser(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      const user = this.userService.update(params.id, body);
      this.sendJsonResponse(res, 200, user);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleDeleteUser(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      this.userService.delete(params.id);
      res.writeHead(204);
      res.end();
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  // --- Project Handlers ---
  private async handleGetProjects(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    const projects = this.projectService.getAll();
    this.sendJsonResponse(res, 200, projects);
  }

  private async handleCreateProject(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.name || !body.description) {
        this.sendErrorResponse(res, 400, 'Name and description are required');
        return;
      }
      const project = this.projectService.create({ name: body.name, description: body.description });
      this.sendJsonResponse(res, 201, project);
    } catch (error: any) {
      this.sendErrorResponse(res, 400, error.message);
    }
  }

  private async handleGetProjectById(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const project = this.projectService.getById(params.id);
      this.sendJsonResponse(res, 200, project);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleUpdateProject(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      const project = this.projectService.update(params.id, body);
      this.sendJsonResponse(res, 200, project);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleDeleteProject(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      this.projectService.delete(params.id);
      res.writeHead(204);
      res.end();
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleAddProjectMember(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.userId) {
        this.sendErrorResponse(res, 400, 'userId is required');
        return;
      }
      const projectId = params.projectId || params.id; // Use projectId if available, else generic id
      if (!projectId) { throw new Error('Project ID missing'); }
      const project = this.projectService.addMember(projectId, body.userId);
      this.sendJsonResponse(res, 200, project);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleRemoveProjectMember(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.userId) {
        this.sendErrorResponse(res, 400, 'userId is required');
        return;
      }
      const projectId = params.projectId || params.id;
      if (!projectId) { throw new Error('Project ID missing'); }
      const project = this.projectService.removeMember(projectId, body.userId);
      this.sendJsonResponse(res, 200, project);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  // --- Task Handlers ---
  private async handleGetTasks(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const { projectId } = query;
      if (projectId) {
        const tasks = this.taskService.getByProject(projectId);
        this.sendJsonResponse(res, 200, tasks);
      } else {
        this.sendErrorResponse(res, 400, 'projectId query parameter is required');
      }
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleCreateTask(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.title || !body.description || !body.projectId) {
        this.sendErrorResponse(res, 400, 'Title, description, and projectId are required');
        return;
      }
      const task = this.taskService.create({ title: body.title, description: body.description, projectId: body.projectId });
      this.sendJsonResponse(res, 201, task);
    } catch (error: any) {
      this.sendErrorResponse(res, 400, error.message);
    }
  }

  private async handleGetTaskById(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const taskId = params.taskId || params.id; // Use taskId if available, else generic id
      if (!taskId) { throw new Error('Task ID missing'); }
      const task = this.taskService.getById(taskId);
      this.sendJsonResponse(res, 200, task);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleUpdateTask(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      const taskId = params.taskId || params.id;
      if (!taskId) { throw new Error('Task ID missing'); }
      const task = this.taskService.update(taskId, body);
      this.sendJsonResponse(res, 200, task);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleDeleteTask(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const taskId = params.taskId || params.id;
      if (!taskId) { throw new Error('Task ID missing'); }
      this.taskService.delete(taskId);
      res.writeHead(204);
      res.end();
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleChangeTaskStatus(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.status) {
        this.sendErrorResponse(res, 400, 'Status is required');
        return;
      }
      const taskId = params.taskId || params.id;
      if (!taskId) { throw new Error('Task ID missing'); }
      const task = this.taskService.changeStatus(taskId, body.status as TaskStatus);
      this.sendJsonResponse(res, 200, task);
    } catch (error: any) {
      this.sendErrorResponse(res, 400, error.message);
    }
  }

  private async handleAssignTask(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.assigneeId) {
        this.sendErrorResponse(res, 400, 'assigneeId is required');
        return;
      }
      const taskId = params.taskId || params.id;
      if (!taskId) { throw new Error('Task ID missing'); }
      const task = this.taskService.assign(taskId, body.assigneeId);
      this.sendJsonResponse(res, 200, task);
    } catch (error: any) {
      this.sendErrorResponse(res, 400, error.message);
    }
  }

  // --- Comment Handlers ---
  private async handleGetComments(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const { taskId } = query;
      if (taskId) {
        const comments = this.commentService.getByTask(taskId);
        this.sendJsonResponse(res, 200, comments);
      } else {
        this.sendErrorResponse(res, 400, 'taskId query parameter is required');
      }
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleCreateComment(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);
      if (!body.taskId || !body.authorId || !body.body) {
        this.sendErrorResponse(res, 400, 'taskId, authorId, and body are required');
        return;
      }
      const comment = this.commentService.create({ taskId: body.taskId, authorId: body.authorId, body: body.body });
      this.sendJsonResponse(res, 201, comment);
    } catch (error: any) {
      this.sendErrorResponse(res, 400, error.message);
    }
  }

  private async handleGetCommentById(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const commentId = params.commentId || params.id;
      if (!commentId) { throw new Error('Comment ID missing'); }
      const comment = this.commentService.getById(commentId);
      this.sendJsonResponse(res, 200, comment);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleDeleteComment(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const commentId = params.commentId || params.id;
      if (!commentId) { throw new Error('Comment ID missing'); }
      this.commentService.delete(commentId);
      res.writeHead(204);
      res.end();
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  // --- Notification Handlers ---
  private async handleGetNotifications(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const { userId } = query;
      if (!userId) {
        this.sendErrorResponse(res, 400, 'userId query parameter is required');
        return;
      }
      const notifications = this.notificationService.getByUser(userId);
      this.sendJsonResponse(res, 200, notifications);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }

  private async handleMarkNotificationAsRead(req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void> {
    try {
      const notificationId = params.notificationId || params.id;
      if (!notificationId) { throw new Error('Notification ID missing'); }
      const notification = this.notificationService.markAsRead(notificationId);
      this.sendJsonResponse(res, 200, notification);
    } catch (error: any) {
      this.sendErrorResponse(res, 404, error.message);
    }
  }
}
