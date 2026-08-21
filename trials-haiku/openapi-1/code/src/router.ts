/**
 * API Router
 * Single entry point for all HTTP handling.
 * Routes requests to appropriate service methods.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  body: any
) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

class Router {
  private routes: Route[] = [];

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // ============ USER ROUTES ============

    // GET /users
    this.addRoute('GET', /^\/users$/, async (req, res) => {
      const users = userService.getAllUsers();
      this.sendJSON(res, 200, users);
    });

    // POST /users
    this.addRoute('POST', /^\/users$/, async (req, res, params, body) => {
      const user = userService.createUser(body);
      this.sendJSON(res, 201, user);
    });

    // GET /users/:id
    this.addRoute('GET', /^\/users\/([^/]+)$/, async (req, res, params) => {
      const user = userService.getUserById(params.id);
      if (!user) {
        this.sendJSON(res, 404, { error: 'User not found' });
        return;
      }
      this.sendJSON(res, 200, user);
    });

    // PUT /users/:id
    this.addRoute('PUT', /^\/users\/([^/]+)$/, async (req, res, params, body) => {
      const user = userService.updateUser(params.id, body);
      if (!user) {
        this.sendJSON(res, 404, { error: 'User not found' });
        return;
      }
      this.sendJSON(res, 200, user);
    });

    // DELETE /users/:id
    this.addRoute('DELETE', /^\/users\/([^/]+)$/, async (req, res, params) => {
      const deleted = userService.deleteUser(params.id);
      if (!deleted) {
        this.sendJSON(res, 404, { error: 'User not found' });
        return;
      }
      res.writeHead(204);
      res.end();
    });

    // ============ PROJECT ROUTES ============

    // GET /projects
    this.addRoute('GET', /^\/projects$/, async (req, res) => {
      const projects = projectService.getAllProjects();
      this.sendJSON(res, 200, projects);
    });

    // POST /projects
    this.addRoute('POST', /^\/projects$/, async (req, res, params, body) => {
      const project = projectService.createProject(body);
      this.sendJSON(res, 201, project);
    });

    // GET /projects/:id
    this.addRoute(
      'GET',
      /^\/projects\/([^/]+)$/,
      async (req, res, params) => {
        const project = projectService.getProjectById(params.id);
        if (!project) {
          this.sendJSON(res, 404, { error: 'Project not found' });
          return;
        }
        this.sendJSON(res, 200, project);
      }
    );

    // PUT /projects/:id
    this.addRoute(
      'PUT',
      /^\/projects\/([^/]+)$/,
      async (req, res, params, body) => {
        const project = projectService.updateProject(params.id, body);
        if (!project) {
          this.sendJSON(res, 404, { error: 'Project not found' });
          return;
        }
        this.sendJSON(res, 200, project);
      }
    );

    // DELETE /projects/:id
    this.addRoute(
      'DELETE',
      /^\/projects\/([^/]+)$/,
      async (req, res, params) => {
        const deleted = projectService.deleteProject(params.id);
        if (!deleted) {
          this.sendJSON(res, 404, { error: 'Project not found' });
          return;
        }
        res.writeHead(204);
        res.end();
      }
    );

    // POST /projects/:id/members
    this.addRoute(
      'POST',
      /^\/projects\/([^/]+)\/members$/,
      async (req, res, params, body) => {
        const project = projectService.addMember(params.id, body.userId);
        if (!project) {
          this.sendJSON(res, 404, { error: 'Project not found' });
          return;
        }
        this.sendJSON(res, 200, project);
      }
    );

    // DELETE /projects/:id/members
    this.addRoute(
      'DELETE',
      /^\/projects\/([^/]+)\/members$/,
      async (req, res, params, body) => {
        const project = projectService.removeMember(params.id, body.userId);
        if (!project) {
          this.sendJSON(res, 404, { error: 'Project not found' });
          return;
        }
        this.sendJSON(res, 200, project);
      }
    );

    // ============ TASK ROUTES ============

    // GET /tasks (by projectId query param)
    this.addRoute('GET', /^\/tasks$/, async (req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      if (!projectId) {
        this.sendJSON(res, 400, { error: 'projectId query parameter required' });
        return;
      }
      const tasks = taskService.getTasksByProject(projectId);
      this.sendJSON(res, 200, tasks);
    });

    // POST /tasks
    this.addRoute('POST', /^\/tasks$/, async (req, res, params, body) => {
      const task = taskService.createTask(body);
      this.sendJSON(res, 201, task);
    });

    // GET /tasks/:id
    this.addRoute('GET', /^\/tasks\/([^/]+)$/, async (req, res, params) => {
      const task = taskService.getTaskById(params.id);
      if (!task) {
        this.sendJSON(res, 404, { error: 'Task not found' });
        return;
      }
      this.sendJSON(res, 200, task);
    });

    // PUT /tasks/:id
    this.addRoute('PUT', /^\/tasks\/([^/]+)$/, async (req, res, params, body) => {
      const task = taskService.updateTask(params.id, body);
      if (!task) {
        this.sendJSON(res, 404, { error: 'Task not found' });
        return;
      }
      this.sendJSON(res, 200, task);
    });

    // DELETE /tasks/:id
    this.addRoute('DELETE', /^\/tasks\/([^/]+)$/, async (req, res, params) => {
      const deleted = taskService.deleteTask(params.id);
      if (!deleted) {
        this.sendJSON(res, 404, { error: 'Task not found' });
        return;
      }
      res.writeHead(204);
      res.end();
    });

    // PUT /tasks/:id/status
    this.addRoute(
      'PUT',
      /^\/tasks\/([^/]+)\/status$/,
      async (req, res, params, body) => {
        try {
          const task = taskService.changeStatus(params.id, body.status);
          if (!task) {
            this.sendJSON(res, 404, { error: 'Task not found' });
            return;
          }
          this.sendJSON(res, 200, task);
        } catch (error: any) {
          this.sendJSON(res, 400, { error: error.message });
        }
      }
    );

    // PUT /tasks/:id/assign
    this.addRoute(
      'PUT',
      /^\/tasks\/([^/]+)\/assign$/,
      async (req, res, params, body) => {
        const task = taskService.assignTask(params.id, body.assigneeId);
        if (!task) {
          this.sendJSON(res, 404, { error: 'Task not found' });
          return;
        }
        this.sendJSON(res, 200, task);
      }
    );

    // ============ COMMENT ROUTES ============

    // GET /comments (by taskId query param)
    this.addRoute('GET', /^\/comments$/, async (req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const taskId = url.searchParams.get('taskId');
      if (!taskId) {
        this.sendJSON(res, 400, { error: 'taskId query parameter required' });
        return;
      }
      const comments = commentService.getCommentsByTask(taskId);
      this.sendJSON(res, 200, comments);
    });

    // POST /comments
    this.addRoute('POST', /^\/comments$/, async (req, res, params, body) => {
      const comment = commentService.createComment(body);
      this.sendJSON(res, 201, comment);
    });

    // GET /comments/:id
    this.addRoute('GET', /^\/comments\/([^/]+)$/, async (req, res, params) => {
      const comment = commentService.getCommentById(params.id);
      if (!comment) {
        this.sendJSON(res, 404, { error: 'Comment not found' });
        return;
      }
      this.sendJSON(res, 200, comment);
    });

    // DELETE /comments/:id
    this.addRoute('DELETE', /^\/comments\/([^/]+)$/, async (req, res, params) => {
      const deleted = commentService.deleteComment(params.id);
      if (!deleted) {
        this.sendJSON(res, 404, { error: 'Comment not found' });
        return;
      }
      res.writeHead(204);
      res.end();
    });

    // ============ NOTIFICATION ROUTES ============

    // GET /notifications (by userId query param)
    this.addRoute('GET', /^\/notifications$/, async (req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      if (!userId) {
        this.sendJSON(res, 400, { error: 'userId query parameter required' });
        return;
      }
      const notifications = notificationService.getNotificationsByUser(userId);
      this.sendJSON(res, 200, notifications);
    });

    // PUT /notifications/:id/read
    this.addRoute(
      'PUT',
      /^\/notifications\/([^/]+)\/read$/,
      async (req, res, params) => {
        const notification = notificationService.markAsRead(params.id);
        if (!notification) {
          this.sendJSON(res, 404, { error: 'Notification not found' });
          return;
        }
        this.sendJSON(res, 200, notification);
      }
    );
  }

  private addRoute(
    method: string,
    pattern: RegExp,
    handler: Handler
  ): void {
    this.routes.push({ method, pattern, handler });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const pathname = new URL(req.url || '', `http://${req.headers.host}`).pathname;
    const method = req.method || 'GET';

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.pattern);
      if (!match) continue;

      // Extract path parameters
      const params: Record<string, string> = {};
      if (match.length > 1) {
        params.id = match[1];
      }

      // Parse request body
      let body: any = {};
      if (method === 'POST' || method === 'PUT') {
        body = await this.parseBody(req);
      }

      try {
        await route.handler(req, res, params, body);
      } catch (error: any) {
        this.sendJSON(res, 500, { error: error.message });
      }
      return;
    }

    // No route found
    this.sendJSON(res, 404, { error: 'Route not found' });
  }

  private parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  private sendJSON(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}

export const router = new Router();
