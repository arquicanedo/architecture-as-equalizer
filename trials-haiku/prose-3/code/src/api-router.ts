/**
 * API Router - Handles HTTP requests and routes them to appropriate services
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export class APIRouter {
  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private commentService: CommentService,
    private notificationService: NotificationService
  ) {}

  /**
   * Main request handler
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method || 'GET';
    const query: Record<string, string> = {};
    
    // Parse query parameters
    for (const [key, value] of urlObj.searchParams) {
      query[key] = value;
    }

    try {
      // Users routes
      if (pathname === '/users' && method === 'GET') {
        return this.respondJSON(res, 200, this.userService.getAllUsers());
      }
      if (pathname === '/users' && method === 'POST') {
        return this.handleCreateUser(req, res);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === 'GET') {
        return this.handleGetUser(pathname, res);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === 'PUT') {
        return this.handleUpdateUser(pathname, req, res);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === 'DELETE') {
        return this.handleDeleteUser(pathname, res);
      }

      // Projects routes
      if (pathname === '/projects' && method === 'GET') {
        return this.respondJSON(res, 200, this.projectService.getAllProjects());
      }
      if (pathname === '/projects' && method === 'POST') {
        return this.handleCreateProject(req, res);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === 'GET') {
        return this.handleGetProject(pathname, res);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === 'PUT') {
        return this.handleUpdateProject(pathname, req, res);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === 'DELETE') {
        return this.handleDeleteProject(pathname, res);
      }
      if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === 'POST') {
        return this.handleAddMember(pathname, req, res);
      }
      if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === 'DELETE') {
        return this.handleRemoveMember(pathname, req, res);
      }

      // Tasks routes
      if (pathname === '/tasks' && method === 'GET') {
        return this.handleGetTasks(query, res);
      }
      if (pathname === '/tasks' && method === 'POST') {
        return this.handleCreateTask(req, res);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === 'GET') {
        return this.handleGetTask(pathname, res);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === 'PUT') {
        return this.handleUpdateTask(pathname, req, res);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === 'DELETE') {
        return this.handleDeleteTask(pathname, res);
      }
      if (pathname.match(/^\/tasks\/[^/]+\/status$/) && method === 'PUT') {
        return this.handleUpdateTaskStatus(pathname, req, res);
      }
      if (pathname.match(/^\/tasks\/[^/]+\/assign$/) && method === 'PUT') {
        return this.handleAssignTask(pathname, req, res);
      }

      // Comments routes
      if (pathname === '/comments' && method === 'GET') {
        return this.handleGetComments(query, res);
      }
      if (pathname === '/comments' && method === 'POST') {
        return this.handleCreateComment(req, res);
      }
      if (pathname.match(/^\/comments\/[^/]+$/) && method === 'GET') {
        return this.handleGetComment(pathname, res);
      }
      if (pathname.match(/^\/comments\/[^/]+$/) && method === 'DELETE') {
        return this.handleDeleteComment(pathname, res);
      }

      // Notifications routes
      if (pathname === '/notifications' && method === 'GET') {
        return this.handleGetNotifications(query, res);
      }
      if (pathname.match(/^\/notifications\/[^/]+\/read$/) && method === 'PUT') {
        return this.handleMarkNotificationAsRead(pathname, res);
      }

      // Not found
      return this.respondJSON(res, 404, { error: 'Not found' });
    } catch (error) {
      console.error('Request error:', error);
      return this.respondJSON(res, 500, { error: 'Internal server error' });
    }
  }

  // User handlers
  private async handleCreateUser(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.parseBody(req);
    const { name, email } = body;
    if (!name || !email) {
      return this.respondJSON(res, 400, {
        error: 'Missing required fields: name, email',
      });
    }
    const user = this.userService.createUser(name, email);
    return this.respondJSON(res, 201, user);
  }

  private handleGetUser(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const user = this.userService.getUser(id);
    if (!user) {
      return this.respondJSON(res, 404, { error: 'User not found' });
    }
    return this.respondJSON(res, 200, user);
  }

  private async handleUpdateUser(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = this.extractId(pathname);
    const body = await this.parseBody(req);
    const user = this.userService.updateUser(id, body);
    if (!user) {
      return this.respondJSON(res, 404, { error: 'User not found' });
    }
    return this.respondJSON(res, 200, user);
  }

  private handleDeleteUser(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const success = this.userService.deleteUser(id);
    if (!success) {
      return this.respondJSON(res, 404, { error: 'User not found' });
    }
    return this.respondJSON(res, 204, null);
  }

  // Project handlers
  private async handleCreateProject(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.parseBody(req);
    const { name, description } = body;
    if (!name || !description) {
      return this.respondJSON(res, 400, {
        error: 'Missing required fields: name, description',
      });
    }
    const project = this.projectService.createProject(name, description);
    return this.respondJSON(res, 201, project);
  }

  private handleGetProject(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const project = this.projectService.getProject(id);
    if (!project) {
      return this.respondJSON(res, 404, { error: 'Project not found' });
    }
    return this.respondJSON(res, 200, project);
  }

  private async handleUpdateProject(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = this.extractId(pathname);
    const body = await this.parseBody(req);
    const project = this.projectService.updateProject(id, body);
    if (!project) {
      return this.respondJSON(res, 404, { error: 'Project not found' });
    }
    return this.respondJSON(res, 200, project);
  }

  private handleDeleteProject(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const success = this.projectService.deleteProject(id);
    if (!success) {
      return this.respondJSON(res, 404, { error: 'Project not found' });
    }
    return this.respondJSON(res, 204, null);
  }

  private async handleAddMember(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const projectId = this.extractId(pathname.replace('/members', ''));
    const body = await this.parseBody(req);
    const { userId } = body;
    if (!userId) {
      return this.respondJSON(res, 400, { error: 'Missing userId' });
    }
    const project = this.projectService.addMember(projectId, userId);
    if (!project) {
      return this.respondJSON(res, 404, { error: 'Project not found' });
    }
    return this.respondJSON(res, 200, project);
  }

  private async handleRemoveMember(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const projectId = this.extractId(pathname.replace('/members', ''));
    const body = await this.parseBody(req);
    const { userId } = body;
    if (!userId) {
      return this.respondJSON(res, 400, { error: 'Missing userId' });
    }
    const project = this.projectService.removeMember(projectId, userId);
    if (!project) {
      return this.respondJSON(res, 404, { error: 'Project not found' });
    }
    return this.respondJSON(res, 200, project);
  }

  // Task handlers
  private handleGetTasks(query: Record<string, string>, res: ServerResponse): void {
    let tasks = this.taskService.getAllTasks();
    if (query.projectId) {
      tasks = this.taskService.getTasksByProject(query.projectId);
    }
    return this.respondJSON(res, 200, tasks);
  }

  private async handleCreateTask(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.parseBody(req);
    const { projectId, title, description } = body;
    if (!projectId || !title || !description) {
      return this.respondJSON(res, 400, {
        error: 'Missing required fields: projectId, title, description',
      });
    }
    const task = this.taskService.createTask(projectId, title, description);
    return this.respondJSON(res, 201, task);
  }

  private handleGetTask(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const task = this.taskService.getTask(id);
    if (!task) {
      return this.respondJSON(res, 404, { error: 'Task not found' });
    }
    return this.respondJSON(res, 200, task);
  }

  private async handleUpdateTask(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = this.extractId(pathname);
    const body = await this.parseBody(req);
    const task = this.taskService.updateTask(id, body);
    if (!task) {
      return this.respondJSON(res, 404, { error: 'Task not found' });
    }
    return this.respondJSON(res, 200, task);
  }

  private handleDeleteTask(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const success = this.taskService.deleteTask(id);
    if (!success) {
      return this.respondJSON(res, 404, { error: 'Task not found' });
    }
    return this.respondJSON(res, 204, null);
  }

  private async handleUpdateTaskStatus(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = this.extractId(pathname.replace('/status', ''));
    const body = await this.parseBody(req);
    const { status } = body;
    if (!status) {
      return this.respondJSON(res, 400, { error: 'Missing status' });
    }
    try {
      const task = this.taskService.updateTaskStatus(id, status);
      if (!task) {
        return this.respondJSON(res, 404, { error: 'Task not found' });
      }
      return this.respondJSON(res, 200, task);
    } catch (error: any) {
      return this.respondJSON(res, 400, { error: error.message });
    }
  }

  private async handleAssignTask(
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = this.extractId(pathname.replace('/assign', ''));
    const body = await this.parseBody(req);
    const { userId } = body;
    if (!userId) {
      return this.respondJSON(res, 400, { error: 'Missing userId' });
    }
    const task = this.taskService.assignTask(id, userId);
    if (!task) {
      return this.respondJSON(res, 404, { error: 'Task not found' });
    }
    return this.respondJSON(res, 200, task);
  }

  // Comment handlers
  private handleGetComments(query: Record<string, string>, res: ServerResponse): void {
    let comments = this.commentService.getAllComments();
    if (query.taskId) {
      comments = this.commentService.getCommentsByTask(query.taskId);
    }
    return this.respondJSON(res, 200, comments);
  }

  private async handleCreateComment(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.parseBody(req);
    const { taskId, authorId, text } = body;
    if (!taskId || !authorId || !text) {
      return this.respondJSON(res, 400, {
        error: 'Missing required fields: taskId, authorId, text',
      });
    }
    const comment = this.commentService.createComment(taskId, authorId, text);
    return this.respondJSON(res, 201, comment);
  }

  private handleGetComment(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const comment = this.commentService.getComment(id);
    if (!comment) {
      return this.respondJSON(res, 404, { error: 'Comment not found' });
    }
    return this.respondJSON(res, 200, comment);
  }

  private handleDeleteComment(pathname: string, res: ServerResponse): void {
    const id = this.extractId(pathname);
    const success = this.commentService.deleteComment(id);
    if (!success) {
      return this.respondJSON(res, 404, { error: 'Comment not found' });
    }
    return this.respondJSON(res, 204, null);
  }

  // Notification handlers
  private handleGetNotifications(query: Record<string, string>, res: ServerResponse): void {
    let notifications = this.notificationService.getAllNotifications();
    if (query.userId) {
      notifications = this.notificationService.getNotificationsByUser(query.userId);
    }
    return this.respondJSON(res, 200, notifications);
  }

  private handleMarkNotificationAsRead(
    pathname: string,
    res: ServerResponse
  ): void {
    const id = this.extractId(pathname.replace('/read', ''));
    const notification = this.notificationService.markAsRead(id);
    if (!notification) {
      return this.respondJSON(res, 404, { error: 'Notification not found' });
    }
    return this.respondJSON(res, 200, notification);
  }

  // Helper methods
  private extractId(pathname: string): string {
    const parts = pathname.split('/').filter((p) => p);
    return parts[parts.length - 1];
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
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

  private respondJSON(
    res: ServerResponse,
    statusCode: number,
    data: any
  ): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    if (statusCode === 204) {
      res.end();
    } else {
      res.end(JSON.stringify(data));
    }
  }
}
