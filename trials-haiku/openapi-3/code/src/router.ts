/**
 * API Router
 * Single entry point for all HTTP requests
 * Routes requests to appropriate services
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService, User, CreateUserInput, UpdateUserInput } from './services/user-service';
import { projectService, Project, CreateProjectInput, UpdateProjectInput } from './services/project-service';
import { taskService, Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from './services/task-service';
import { commentService, Comment, CreateCommentInput } from './services/comment-service';
import { notificationService, Notification } from './services/notification-service';

interface ParsedRequest {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
  body?: any;
}

/**
 * Parse incoming request
 */
async function parseRequest(req: IncomingMessage): Promise<ParsedRequest> {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const method = req.method || 'GET';
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  let body: any;
  if (method !== 'GET' && method !== 'DELETE') {
    body = await readBody(req);
  }

  return { method, pathname, searchParams, body };
}

/**
 * Read request body
 */
function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send response
 */
function sendResponse(
  res: ServerResponse,
  statusCode: number,
  data: any,
  contentType: string = 'application/json'
): void {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(JSON.stringify(data));
}

/**
 * Handle requests
 */
export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const parsed = await parseRequest(req);
    const { method, pathname, searchParams, body } = parsed;

    // User routes
    if (pathname === '/users' && method === 'GET') {
      const users = userService.listUsers();
      return sendResponse(res, 200, users);
    }

    if (pathname === '/users' && method === 'POST') {
      const input: CreateUserInput = body;
      const user = userService.createUser(input);
      return sendResponse(res, 201, user);
    }

    const userIdMatch = pathname.match(/^\/users\/([^/]+)$/);
    if (userIdMatch) {
      const userId = userIdMatch[1];

      if (method === 'GET') {
        const user = userService.getUser(userId);
        if (!user) return sendResponse(res, 404, { error: 'User not found' });
        return sendResponse(res, 200, user);
      }

      if (method === 'PUT') {
        const input: UpdateUserInput = body;
        const user = userService.updateUser(userId, input);
        if (!user) return sendResponse(res, 404, { error: 'User not found' });
        return sendResponse(res, 200, user);
      }

      if (method === 'DELETE') {
        const deleted = userService.deleteUser(userId);
        if (!deleted) return sendResponse(res, 404, { error: 'User not found' });
        return sendResponse(res, 204, null);
      }
    }

    // Project routes
    if (pathname === '/projects' && method === 'GET') {
      const projects = projectService.listProjects();
      return sendResponse(res, 200, projects);
    }

    if (pathname === '/projects' && method === 'POST') {
      const input: CreateProjectInput = body;
      const project = projectService.createProject(input);
      return sendResponse(res, 201, project);
    }

    const projectIdMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectIdMatch) {
      const projectId = projectIdMatch[1];

      if (method === 'GET') {
        const project = projectService.getProject(projectId);
        if (!project) return sendResponse(res, 404, { error: 'Project not found' });
        return sendResponse(res, 200, project);
      }

      if (method === 'PUT') {
        const input: UpdateProjectInput = body;
        const project = projectService.updateProject(projectId, input);
        if (!project) return sendResponse(res, 404, { error: 'Project not found' });
        return sendResponse(res, 200, project);
      }

      if (method === 'DELETE') {
        const deleted = projectService.deleteProject(projectId);
        if (!deleted) return sendResponse(res, 404, { error: 'Project not found' });
        return sendResponse(res, 204, null);
      }
    }

    // Project members routes
    const membersMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
    if (membersMatch) {
      const projectId = membersMatch[1];

      if (method === 'POST') {
        const { userId } = body;
        const project = projectService.addMember(projectId, userId);
        if (!project) return sendResponse(res, 404, { error: 'Project not found' });
        return sendResponse(res, 200, project);
      }

      if (method === 'DELETE') {
        const { userId } = body;
        const project = projectService.removeMember(projectId, userId);
        if (!project) return sendResponse(res, 404, { error: 'Project not found' });
        return sendResponse(res, 200, project);
      }
    }

    // Task routes
    if (pathname === '/tasks' && method === 'GET') {
      const projectId = searchParams.get('projectId');
      if (!projectId) return sendResponse(res, 400, { error: 'projectId query parameter required' });
      const tasks = taskService.listTasksByProject(projectId);
      return sendResponse(res, 200, tasks);
    }

    if (pathname === '/tasks' && method === 'POST') {
      const input: CreateTaskInput = body;
      const task = taskService.createTask(input);
      return sendResponse(res, 201, task);
    }

    const taskIdMatch = pathname.match(/^\/tasks\/([^/]+)$/);
    if (taskIdMatch) {
      const taskId = taskIdMatch[1];

      if (method === 'GET') {
        const task = taskService.getTask(taskId);
        if (!task) return sendResponse(res, 404, { error: 'Task not found' });
        return sendResponse(res, 200, task);
      }

      if (method === 'PUT') {
        const input: UpdateTaskInput = body;
        const task = taskService.updateTask(taskId, input);
        if (!task) return sendResponse(res, 404, { error: 'Task not found' });
        return sendResponse(res, 200, task);
      }

      if (method === 'DELETE') {
        const deleted = taskService.deleteTask(taskId);
        if (!deleted) return sendResponse(res, 404, { error: 'Task not found' });
        return sendResponse(res, 204, null);
      }
    }

    // Task status route
    const statusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
    if (statusMatch && method === 'PUT') {
      const taskId = statusMatch[1];
      const { status } = body as { status: TaskStatus };
      const task = taskService.changeStatus(taskId, status);
      if (!task) return sendResponse(res, 404, { error: 'Task not found or invalid transition' });
      return sendResponse(res, 200, task);
    }

    // Task assign route
    const assignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
    if (assignMatch && method === 'PUT') {
      const taskId = assignMatch[1];
      const { assigneeId } = body;
      const task = taskService.assignTask(taskId, assigneeId);
      if (!task) return sendResponse(res, 404, { error: 'Task not found' });
      return sendResponse(res, 200, task);
    }

    // Comment routes
    if (pathname === '/comments' && method === 'GET') {
      const taskId = searchParams.get('taskId');
      if (!taskId) return sendResponse(res, 400, { error: 'taskId query parameter required' });
      const comments = commentService.listCommentsByTask(taskId);
      return sendResponse(res, 200, comments);
    }

    if (pathname === '/comments' && method === 'POST') {
      const input: CreateCommentInput = body;
      const task = taskService.getTask(input.taskId);
      if (!task) return sendResponse(res, 404, { error: 'Task not found' });
      const author = userService.getUser(input.authorId);
      if (!author) return sendResponse(res, 404, { error: 'Author not found' });
      const comment = commentService.createComment(input, task.title, author.name);
      return sendResponse(res, 201, comment);
    }

    const commentIdMatch = pathname.match(/^\/comments\/([^/]+)$/);
    if (commentIdMatch) {
      const commentId = commentIdMatch[1];

      if (method === 'GET') {
        const comment = commentService.getComment(commentId);
        if (!comment) return sendResponse(res, 404, { error: 'Comment not found' });
        return sendResponse(res, 200, comment);
      }

      if (method === 'DELETE') {
        const deleted = commentService.deleteComment(commentId);
        if (!deleted) return sendResponse(res, 404, { error: 'Comment not found' });
        return sendResponse(res, 204, null);
      }
    }

    // Notification routes
    if (pathname === '/notifications' && method === 'GET') {
      const userId = searchParams.get('userId');
      if (!userId) return sendResponse(res, 400, { error: 'userId query parameter required' });
      const notifications = notificationService.listNotifications(userId);
      return sendResponse(res, 200, notifications);
    }

    const notificationReadMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
    if (notificationReadMatch && method === 'PUT') {
      const notificationId = notificationReadMatch[1];
      const notification = notificationService.markAsRead(notificationId);
      if (!notification) return sendResponse(res, 404, { error: 'Notification not found' });
      return sendResponse(res, 200, notification);
    }

    // 404
    sendResponse(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Request error:', error);
    sendResponse(res, 500, { error: 'Internal server error' });
  }
}
