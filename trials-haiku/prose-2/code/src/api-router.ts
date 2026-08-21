/**
 * API Router - handles HTTP requests and routes them to appropriate services
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService } from './user-service.js';
import { projectService } from './project-service.js';
import { taskService } from './task-service.js';
import { commentService } from './comment-service.js';
import { notificationService } from './notification-service.js';

export class APIRouter {
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    try {
      // Users routes
      if (pathname === '/users' && method === 'GET') {
        return this.getAllUsers(res);
      }
      if (pathname === '/users' && method === 'POST') {
        return this.createUser(req, res);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === 'GET') {
        const userId = pathname.split('/')[2];
        return this.getUser(res, userId);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === 'PUT') {
        const userId = pathname.split('/')[2];
        return this.updateUser(req, res, userId);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === 'DELETE') {
        const userId = pathname.split('/')[2];
        return this.deleteUser(res, userId);
      }

      // Projects routes
      if (pathname === '/projects' && method === 'GET') {
        return this.getAllProjects(res);
      }
      if (pathname === '/projects' && method === 'POST') {
        return this.createProject(req, res);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === 'GET') {
        const projectId = pathname.split('/')[2];
        return this.getProject(res, projectId);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === 'PUT') {
        const projectId = pathname.split('/')[2];
        return this.updateProject(req, res, projectId);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === 'DELETE') {
        const projectId = pathname.split('/')[2];
        return this.deleteProject(res, projectId);
      }

      // Projects members routes
      if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === 'POST') {
        const projectId = pathname.split('/')[2];
        return this.addMember(req, res, projectId);
      }
      if (pathname.match(/^\/projects\/[^/]+\/members\/[^/]+$/) && method === 'DELETE') {
        const parts = pathname.split('/');
        const projectId = parts[2];
        const userId = parts[4];
        return this.removeMember(res, projectId, userId);
      }

      // Tasks routes
      if (pathname === '/tasks' && method === 'GET') {
        const projectId = url.searchParams.get('projectId') || undefined;
        return this.getAllTasks(res, projectId);
      }
      if (pathname === '/tasks' && method === 'POST') {
        return this.createTask(req, res);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === 'GET') {
        const taskId = pathname.split('/')[2];
        return this.getTask(res, taskId);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === 'PUT') {
        const taskId = pathname.split('/')[2];
        return this.updateTask(req, res, taskId);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === 'DELETE') {
        const taskId = pathname.split('/')[2];
        return this.deleteTask(res, taskId);
      }

      // Task status route
      if (pathname.match(/^\/tasks\/[^/]+\/status$/) && method === 'PUT') {
        const taskId = pathname.split('/')[2];
        return this.changeTaskStatus(req, res, taskId);
      }

      // Task assign route
      if (pathname.match(/^\/tasks\/[^/]+\/assign$/) && method === 'PUT') {
        const taskId = pathname.split('/')[2];
        return this.assignTask(req, res, taskId);
      }

      // Comments routes
      if (pathname === '/comments' && method === 'GET') {
        const taskId = url.searchParams.get('taskId') || undefined;
        return this.getAllComments(res, taskId);
      }
      if (pathname === '/comments' && method === 'POST') {
        return this.createComment(req, res);
      }
      if (pathname.match(/^\/comments\/[^/]+$/) && method === 'GET') {
        const commentId = pathname.split('/')[2];
        return this.getComment(res, commentId);
      }
      if (pathname.match(/^\/comments\/[^/]+$/) && method === 'DELETE') {
        const commentId = pathname.split('/')[2];
        return this.deleteComment(res, commentId);
      }

      // Notifications routes
      if (pathname === '/notifications' && method === 'GET') {
        const userId = url.searchParams.get('userId') || undefined;
        return this.getAllNotifications(res, userId);
      }
      if (pathname.match(/^\/notifications\/[^/]+\/read$/) && method === 'PUT') {
        const notificationId = pathname.split('/')[2];
        return this.markNotificationAsRead(res, notificationId);
      }

      // 404 Not Found
      this.sendJson(res, 404, { error: 'Not Found' });
    } catch (error) {
      console.error('Error handling request:', error);
      this.sendJson(res, 500, { error: 'Internal Server Error' });
    }
  }

  // Utility methods
  private async readJsonBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  // Users handlers
  private getAllUsers(res: ServerResponse): void {
    const users = userService.getAllUsers();
    this.sendJson(res, 200, users);
  }

  private async createUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { name, email } = body;
      if (!name || !email) {
        return this.sendJson(res, 400, { error: 'Missing name or email' });
      }
      const user = userService.createUser(String(name), String(email));
      this.sendJson(res, 201, user);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private getUser(res: ServerResponse, userId: string): void {
    const user = userService.getUser(userId);
    if (!user) {
      return this.sendJson(res, 404, { error: 'User not found' });
    }
    this.sendJson(res, 200, user);
  }

  private async updateUser(
    req: IncomingMessage,
    res: ServerResponse,
    userId: string
  ): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const user = userService.updateUser(userId, body.name as string, body.email as string);
      if (!user) {
        return this.sendJson(res, 404, { error: 'User not found' });
      }
      this.sendJson(res, 200, user);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private deleteUser(res: ServerResponse, userId: string): void {
    const deleted = userService.deleteUser(userId);
    if (!deleted) {
      return this.sendJson(res, 404, { error: 'User not found' });
    }
    this.sendJson(res, 200, { message: 'User deleted' });
  }

  // Projects handlers
  private getAllProjects(res: ServerResponse): void {
    const projects = projectService.getAllProjects();
    this.sendJson(res, 200, projects);
  }

  private async createProject(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { name, description, creatorId } = body;
      if (!name) {
        return this.sendJson(res, 400, { error: 'Missing name' });
      }
      const project = projectService.createProject(
        String(name),
        String(description || ''),
        creatorId as string | undefined
      );
      this.sendJson(res, 201, project);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private getProject(res: ServerResponse, projectId: string): void {
    const project = projectService.getProject(projectId);
    if (!project) {
      return this.sendJson(res, 404, { error: 'Project not found' });
    }
    this.sendJson(res, 200, project);
  }

  private async updateProject(
    req: IncomingMessage,
    res: ServerResponse,
    projectId: string
  ): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const project = projectService.updateProject(
        projectId,
        body.name as string,
        body.description as string
      );
      if (!project) {
        return this.sendJson(res, 404, { error: 'Project not found' });
      }
      this.sendJson(res, 200, project);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private deleteProject(res: ServerResponse, projectId: string): void {
    const deleted = projectService.deleteProject(projectId);
    if (!deleted) {
      return this.sendJson(res, 404, { error: 'Project not found' });
    }
    this.sendJson(res, 200, { message: 'Project deleted' });
  }

  private async addMember(
    req: IncomingMessage,
    res: ServerResponse,
    projectId: string
  ): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { userId } = body;
      if (!userId) {
        return this.sendJson(res, 400, { error: 'Missing userId' });
      }
      const project = projectService.addMember(projectId, String(userId));
      if (!project) {
        return this.sendJson(res, 404, { error: 'Project not found' });
      }
      this.sendJson(res, 200, project);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private removeMember(res: ServerResponse, projectId: string, userId: string): void {
    const project = projectService.removeMember(projectId, userId);
    if (!project) {
      return this.sendJson(res, 404, { error: 'Project not found' });
    }
    this.sendJson(res, 200, project);
  }

  // Tasks handlers
  private getAllTasks(res: ServerResponse, projectId?: string): void {
    const tasks = taskService.getAllTasks(projectId);
    this.sendJson(res, 200, tasks);
  }

  private async createTask(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { projectId, title, description } = body;
      if (!projectId || !title) {
        return this.sendJson(res, 400, { error: 'Missing projectId or title' });
      }
      const task = taskService.createTask(
        String(projectId),
        String(title),
        String(description || '')
      );
      this.sendJson(res, 201, task);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private getTask(res: ServerResponse, taskId: string): void {
    const task = taskService.getTask(taskId);
    if (!task) {
      return this.sendJson(res, 404, { error: 'Task not found' });
    }
    this.sendJson(res, 200, task);
  }

  private async updateTask(
    req: IncomingMessage,
    res: ServerResponse,
    taskId: string
  ): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const task = taskService.updateTask(
        taskId,
        body.title as string,
        body.description as string
      );
      if (!task) {
        return this.sendJson(res, 404, { error: 'Task not found' });
      }
      this.sendJson(res, 200, task);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private deleteTask(res: ServerResponse, taskId: string): void {
    const deleted = taskService.deleteTask(taskId);
    if (!deleted) {
      return this.sendJson(res, 404, { error: 'Task not found' });
    }
    this.sendJson(res, 200, { message: 'Task deleted' });
  }

  private async changeTaskStatus(
    req: IncomingMessage,
    res: ServerResponse,
    taskId: string
  ): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { status } = body;
      if (!status) {
        return this.sendJson(res, 400, { error: 'Missing status' });
      }
      const task = taskService.changeStatus(taskId, String(status) as any);
      if (!task) {
        return this.sendJson(res, 404, { error: 'Task not found' });
      }
      this.sendJson(res, 200, task);
    } catch (error) {
      this.sendJson(res, 400, { error: (error as Error).message });
    }
  }

  private async assignTask(
    req: IncomingMessage,
    res: ServerResponse,
    taskId: string
  ): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { userId } = body;
      if (!userId) {
        return this.sendJson(res, 400, { error: 'Missing userId' });
      }
      const task = taskService.assignTask(taskId, String(userId));
      if (!task) {
        return this.sendJson(res, 404, { error: 'Task not found' });
      }
      this.sendJson(res, 200, task);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  // Comments handlers
  private getAllComments(res: ServerResponse, taskId?: string): void {
    const comments = commentService.getAllComments(taskId);
    this.sendJson(res, 200, comments);
  }

  private async createComment(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = (await this.readJsonBody(req)) as Record<string, unknown>;
      const { taskId, authorId, text } = body;
      if (!taskId || !authorId || !text) {
        return this.sendJson(res, 400, { error: 'Missing taskId, authorId, or text' });
      }
      const comment = commentService.createComment(
        String(taskId),
        String(authorId),
        String(text)
      );
      this.sendJson(res, 201, comment);
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid request' });
    }
  }

  private getComment(res: ServerResponse, commentId: string): void {
    const comment = commentService.getComment(commentId);
    if (!comment) {
      return this.sendJson(res, 404, { error: 'Comment not found' });
    }
    this.sendJson(res, 200, comment);
  }

  private deleteComment(res: ServerResponse, commentId: string): void {
    const deleted = commentService.deleteComment(commentId);
    if (!deleted) {
      return this.sendJson(res, 404, { error: 'Comment not found' });
    }
    this.sendJson(res, 200, { message: 'Comment deleted' });
  }

  // Notifications handlers
  private getAllNotifications(res: ServerResponse, userId?: string): void {
    const notifications = notificationService.getAllNotifications(userId);
    this.sendJson(res, 200, notifications);
  }

  private markNotificationAsRead(res: ServerResponse, notificationId: string): void {
    const notification = notificationService.markAsRead(notificationId);
    if (!notification) {
      return this.sendJson(res, 404, { error: 'Notification not found' });
    }
    this.sendJson(res, 200, notification);
  }
}

export const apiRouter = new APIRouter();
