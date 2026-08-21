/**
 * API Router - HTTP request routing and JSON handling
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService, User } from './user-service';
import { projectService, Project } from './project-service';
import { taskService, Task, TaskStatus } from './task-service';
import { commentService } from './comment-service';
import { notificationService } from './notification-service';

type RequestHandler = (
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => void;

interface Route {
  pattern: RegExp;
  methods: Record<string, RequestHandler>;
}

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function extractPathParams(
  pattern: RegExp,
  path: string
): Record<string, string> | null {
  const match = path.match(pattern);
  if (!match) return null;

  const params: Record<string, string> = {};
  const namedGroups = pattern.exec(path)?.groups || {};
  Object.assign(params, namedGroups);
  return params;
}

export class ApiRouter {
  private routes: Route[] = [];

  constructor() {
    this.setupRoutes();
  }

  /**
   * Setup all routes
   */
  private setupRoutes(): void {
    // Users routes
    this.addRoute(/^\/users\/?$/, 'GET', this.handleGetUsers);
    this.addRoute(/^\/users\/?$/, 'POST', this.handleCreateUser);
    this.addRoute(/^\/users\/(?<id>[^/]+)\/?$/, 'GET', this.handleGetUser);
    this.addRoute(/^\/users\/(?<id>[^/]+)\/?$/, 'PUT', this.handleUpdateUser);
    this.addRoute(/^\/users\/(?<id>[^/]+)\/?$/, 'DELETE', this.handleDeleteUser);

    // Projects routes
    this.addRoute(/^\/projects\/?$/, 'GET', this.handleGetProjects);
    this.addRoute(/^\/projects\/?$/, 'POST', this.handleCreateProject);
    this.addRoute(
      /^\/projects\/(?<id>[^/]+)\/?$/,
      'GET',
      this.handleGetProject
    );
    this.addRoute(
      /^\/projects\/(?<id>[^/]+)\/?$/,
      'PUT',
      this.handleUpdateProject
    );
    this.addRoute(
      /^\/projects\/(?<id>[^/]+)\/?$/,
      'DELETE',
      this.handleDeleteProject
    );
    this.addRoute(
      /^\/projects\/(?<id>[^/]+)\/members\/?$/,
      'POST',
      this.handleAddMember
    );
    this.addRoute(
      /^\/projects\/(?<id>[^/]+)\/members\/?$/,
      'DELETE',
      this.handleRemoveMember
    );

    // Tasks routes
    this.addRoute(/^\/tasks\/?$/, 'GET', this.handleGetTasks);
    this.addRoute(/^\/tasks\/?$/, 'POST', this.handleCreateTask);
    this.addRoute(/^\/tasks\/(?<id>[^/]+)\/?$/, 'GET', this.handleGetTask);
    this.addRoute(/^\/tasks\/(?<id>[^/]+)\/?$/, 'PUT', this.handleUpdateTask);
    this.addRoute(/^\/tasks\/(?<id>[^/]+)\/?$/, 'DELETE', this.handleDeleteTask);
    this.addRoute(
      /^\/tasks\/(?<id>[^/]+)\/status\/?$/,
      'PUT',
      this.handleUpdateTaskStatus
    );
    this.addRoute(
      /^\/tasks\/(?<id>[^/]+)\/assign\/?$/,
      'PUT',
      this.handleAssignTask
    );

    // Comments routes
    this.addRoute(/^\/comments\/?$/, 'GET', this.handleGetComments);
    this.addRoute(/^\/comments\/?$/, 'POST', this.handleAddComment);
    this.addRoute(/^\/comments\/(?<id>[^/]+)\/?$/, 'DELETE', this.handleDeleteComment);

    // Notifications routes
    this.addRoute(/^\/notifications\/?$/, 'GET', this.handleGetNotifications);
    this.addRoute(
      /^\/notifications\/(?<id>[^/]+)\/read\/?$/,
      'PUT',
      this.handleMarkNotificationRead
    );
  }

  /**
   * Add a route
   */
  private addRoute(
    pattern: RegExp,
    method: string,
    handler: RequestHandler
  ): void {
    let route = this.routes.find((r) => r.pattern.source === pattern.source);
    if (!route) {
      route = { pattern, methods: {} };
      this.routes.push(route);
    }
    route.methods[method] = handler;
  }

  /**
   * Handle incoming requests
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    // Find matching route
    for (const route of this.routes) {
      const params = extractPathParams(route.pattern, pathname);
      if (params !== null && route.methods[method]) {
        try {
          route.methods[method](req, res, params);
        } catch (error) {
          console.error('Error handling request:', error);
          sendJson(res, 500, { error: 'Internal server error' });
        }
        return;
      }
    }

    sendJson(res, 404, { error: 'Not found' });
  }

  // User handlers
  private handleGetUsers = (_req: IncomingMessage, res: ServerResponse) => {
    const users = userService.getAllUsers();
    sendJson(res, 200, users);
  };

  private handleCreateUser = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const body = (await parseJsonBody(req)) as {
        name?: string;
        email?: string;
      };
      if (!body.name || !body.email) {
        sendJson(res, 400, { error: 'Missing name or email' });
        return;
      }
      const user = userService.createUser(body.name, body.email);
      sendJson(res, 201, user);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleGetUser = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const user = userService.getUser(params.id);
    if (!user) {
      sendJson(res, 404, { error: 'User not found' });
      return;
    }
    sendJson(res, 200, user);
  };

  private handleUpdateUser = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as Partial<User>;
      const user = userService.updateUser(params.id, body);
      if (!user) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }
      sendJson(res, 200, user);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleDeleteUser = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const deleted = userService.deleteUser(params.id);
    if (!deleted) {
      sendJson(res, 404, { error: 'User not found' });
      return;
    }
    sendJson(res, 204, {});
  };

  // Project handlers
  private handleGetProjects = (_req: IncomingMessage, res: ServerResponse) => {
    const projects = projectService.getAllProjects();
    sendJson(res, 200, projects);
  };

  private handleCreateProject = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const body = (await parseJsonBody(req)) as {
        name?: string;
        description?: string;
      };
      if (!body.name) {
        sendJson(res, 400, { error: 'Missing name' });
        return;
      }
      const project = projectService.createProject(
        body.name,
        body.description || ''
      );
      sendJson(res, 201, project);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleGetProject = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const project = projectService.getProject(params.id);
    if (!project) {
      sendJson(res, 404, { error: 'Project not found' });
      return;
    }
    sendJson(res, 200, project);
  };

  private handleUpdateProject = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as Partial<Project>;
      const project = projectService.updateProject(params.id, body);
      if (!project) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }
      sendJson(res, 200, project);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleDeleteProject = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const deleted = projectService.deleteProject(params.id);
    if (!deleted) {
      sendJson(res, 404, { error: 'Project not found' });
      return;
    }
    sendJson(res, 204, {});
  };

  private handleAddMember = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as { userId?: string };
      if (!body.userId) {
        sendJson(res, 400, { error: 'Missing userId' });
        return;
      }
      const project = projectService.addMember(params.id, body.userId);
      if (!project) {
        sendJson(res, 404, { error: 'Project or user not found' });
        return;
      }
      sendJson(res, 200, project);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleRemoveMember = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as { userId?: string };
      if (!body.userId) {
        sendJson(res, 400, { error: 'Missing userId' });
        return;
      }
      const project = projectService.removeMember(params.id, body.userId);
      if (!project) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }
      sendJson(res, 200, project);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  // Task handlers
  private handleGetTasks = (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const projectId = url.searchParams.get('projectId');

    let tasks = taskService.getAllTasks();
    if (projectId) {
      tasks = tasks.filter((task) => task.projectId === projectId);
    }
    sendJson(res, 200, tasks);
  };

  private handleCreateTask = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const body = (await parseJsonBody(req)) as {
        projectId?: string;
        title?: string;
        description?: string;
      };
      if (!body.projectId || !body.title) {
        sendJson(res, 400, { error: 'Missing projectId or title' });
        return;
      }
      const task = taskService.createTask(
        body.projectId,
        body.title,
        body.description || ''
      );
      if (!task) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }
      sendJson(res, 201, task);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleGetTask = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const task = taskService.getTask(params.id);
    if (!task) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }
    sendJson(res, 200, task);
  };

  private handleUpdateTask = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as Partial<Task>;
      const task = taskService.updateTask(params.id, body);
      if (!task) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }
      sendJson(res, 200, task);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleDeleteTask = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const deleted = taskService.deleteTask(params.id);
    if (!deleted) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }
    sendJson(res, 204, {});
  };

  private handleUpdateTaskStatus = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as { status?: string };
      if (!body.status) {
        sendJson(res, 400, { error: 'Missing status' });
        return;
      }
      const task = taskService.updateStatus(
        params.id,
        body.status as TaskStatus
      );
      if (!task) {
        sendJson(res, 400, { error: 'Task not found or invalid status transition' });
        return;
      }
      sendJson(res, 200, task);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleAssignTask = async (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const body = (await parseJsonBody(req)) as { assignee?: string };
      if (!body.assignee) {
        sendJson(res, 400, { error: 'Missing assignee' });
        return;
      }
      const task = taskService.assignTask(params.id, body.assignee);
      if (!task) {
        sendJson(res, 404, { error: 'Task or user not found' });
        return;
      }
      sendJson(res, 200, task);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  // Comment handlers
  private handleGetComments = (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const taskId = url.searchParams.get('taskId');

    let comments = commentService.getAllComments();
    if (taskId) {
      comments = commentService.getCommentsByTask(taskId);
    }
    sendJson(res, 200, comments);
  };

  private handleAddComment = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    try {
      const body = (await parseJsonBody(req)) as {
        taskId?: string;
        authorId?: string;
        text?: string;
      };
      if (!body.taskId || !body.authorId || !body.text) {
        sendJson(res, 400, { error: 'Missing taskId, authorId, or text' });
        return;
      }
      const comment = commentService.addComment(
        body.taskId,
        body.authorId,
        body.text
      );
      if (!comment) {
        sendJson(res, 404, { error: 'Task or user not found' });
        return;
      }
      sendJson(res, 201, comment);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };

  private handleDeleteComment = (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    const deleted = commentService.deleteComment(params.id);
    if (!deleted) {
      sendJson(res, 404, { error: 'Comment not found' });
      return;
    }
    sendJson(res, 204, {});
  };

  // Notification handlers
  private handleGetNotifications = (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    let notifications = notificationService.getAllNotifications();
    if (userId) {
      notifications = notificationService.getNotificationsByUser(userId);
    }
    sendJson(res, 200, notifications);
  };

  private handleMarkNotificationRead = async (
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => {
    try {
      const notification = notificationService.markAsRead(params.id);
      if (!notification) {
        sendJson(res, 404, { error: 'Notification not found' });
        return;
      }
      sendJson(res, 200, notification);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  };
}

export const apiRouter = new ApiRouter();
