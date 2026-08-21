/**
 * API Router
 * Single entry point for all HTTP requests.
 * Routes to services and returns JSON responses.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';

interface RouteHandler {
  (req: IncomingMessage, res: ServerResponse, params: Record<string, any>): void;
}

/**
 * Parse request body as JSON
 */
function parseBody(req: IncomingMessage): Promise<any> {
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

/**
 * Send JSON response
 */
function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: any
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

/**
 * Extract path and method from request
 */
function getParsedUrl(req: IncomingMessage): URL {
  const url = req.url || '/';
  return new URL(url, `http://${req.headers.host || 'localhost'}`);
}

/**
 * Match routes and extract parameters
 */
function matchRoute(
  pathname: string,
  method: string
): { handler: RouteHandler | null; params: Record<string, any> } {
  const parts = pathname.split('/').filter(Boolean);

  // GET /users
  if (method === 'GET' && parts.length === 1 && parts[0] === 'users') {
    return {
      handler: async (req, res) => {
        const users = userService.listAll();
        sendJson(res, 200, users);
      },
      params: {},
    };
  }

  // POST /users
  if (method === 'POST' && parts.length === 1 && parts[0] === 'users') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.name || !body.email) {
            return sendError(res, 400, 'name and email are required');
          }
          const user = userService.create(body.name, body.email);
          sendJson(res, 201, user);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: {},
    };
  }

  // GET /users/:id
  if (method === 'GET' && parts.length === 2 && parts[0] === 'users') {
    return {
      handler: async (req, res) => {
        const user = userService.getById(parts[1]);
        if (!user) {
          return sendError(res, 404, 'User not found');
        }
        sendJson(res, 200, user);
      },
      params: { id: parts[1] },
    };
  }

  // PUT /users/:id
  if (method === 'PUT' && parts.length === 2 && parts[0] === 'users') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          const user = userService.update(parts[1], body);
          if (!user) {
            return sendError(res, 404, 'User not found');
          }
          sendJson(res, 200, user);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // DELETE /users/:id
  if (method === 'DELETE' && parts.length === 2 && parts[0] === 'users') {
    return {
      handler: async (req, res) => {
        const deleted = userService.delete(parts[1]);
        if (!deleted) {
          return sendError(res, 404, 'User not found');
        }
        res.writeHead(204);
        res.end();
      },
      params: { id: parts[1] },
    };
  }

  // GET /projects
  if (method === 'GET' && parts.length === 1 && parts[0] === 'projects') {
    return {
      handler: async (req, res) => {
        const projects = projectService.listAll();
        sendJson(res, 200, projects);
      },
      params: {},
    };
  }

  // POST /projects
  if (method === 'POST' && parts.length === 1 && parts[0] === 'projects') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.name || !body.description) {
            return sendError(res, 400, 'name and description are required');
          }
          const project = projectService.create(body.name, body.description);
          sendJson(res, 201, project);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: {},
    };
  }

  // GET /projects/:id
  if (method === 'GET' && parts.length === 2 && parts[0] === 'projects') {
    return {
      handler: async (req, res) => {
        const project = projectService.getById(parts[1]);
        if (!project) {
          return sendError(res, 404, 'Project not found');
        }
        sendJson(res, 200, project);
      },
      params: { id: parts[1] },
    };
  }

  // PUT /projects/:id
  if (method === 'PUT' && parts.length === 2 && parts[0] === 'projects') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          const project = projectService.update(parts[1], body);
          if (!project) {
            return sendError(res, 404, 'Project not found');
          }
          sendJson(res, 200, project);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // DELETE /projects/:id
  if (method === 'DELETE' && parts.length === 2 && parts[0] === 'projects') {
    return {
      handler: async (req, res) => {
        const deleted = projectService.delete(parts[1]);
        if (!deleted) {
          return sendError(res, 404, 'Project not found');
        }
        res.writeHead(204);
        res.end();
      },
      params: { id: parts[1] },
    };
  }

  // POST /projects/:id/members
  if (
    method === 'POST' &&
    parts.length === 3 &&
    parts[0] === 'projects' &&
    parts[2] === 'members'
  ) {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.userId) {
            return sendError(res, 400, 'userId is required');
          }
          const project = projectService.addMember(parts[1], body.userId);
          if (!project) {
            return sendError(res, 404, 'Project not found');
          }
          sendJson(res, 200, project);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // DELETE /projects/:id/members
  if (
    method === 'DELETE' &&
    parts.length === 3 &&
    parts[0] === 'projects' &&
    parts[2] === 'members'
  ) {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.userId) {
            return sendError(res, 400, 'userId is required');
          }
          const project = projectService.removeMember(parts[1], body.userId);
          if (!project) {
            return sendError(res, 404, 'Project not found');
          }
          sendJson(res, 200, project);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // GET /tasks (with projectId query param)
  if (method === 'GET' && parts.length === 1 && parts[0] === 'tasks') {
    return {
      handler: async (req, res) => {
        const url = getParsedUrl(req);
        const projectId = url.searchParams.get('projectId');
        if (!projectId) {
          return sendError(res, 400, 'projectId query parameter is required');
        }
        const tasks = taskService.listByProject(projectId);
        sendJson(res, 200, tasks);
      },
      params: {},
    };
  }

  // POST /tasks
  if (method === 'POST' && parts.length === 1 && parts[0] === 'tasks') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.title || !body.description || !body.projectId) {
            return sendError(
              res,
              400,
              'title, description, and projectId are required'
            );
          }
          const task = taskService.create(
            body.title,
            body.description,
            body.projectId
          );
          sendJson(res, 201, task);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: {},
    };
  }

  // GET /tasks/:id
  if (method === 'GET' && parts.length === 2 && parts[0] === 'tasks') {
    return {
      handler: async (req, res) => {
        const task = taskService.getById(parts[1]);
        if (!task) {
          return sendError(res, 404, 'Task not found');
        }
        sendJson(res, 200, task);
      },
      params: { id: parts[1] },
    };
  }

  // PUT /tasks/:id
  if (method === 'PUT' && parts.length === 2 && parts[0] === 'tasks') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          const task = taskService.update(parts[1], body);
          if (!task) {
            return sendError(res, 404, 'Task not found');
          }
          sendJson(res, 200, task);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // DELETE /tasks/:id
  if (method === 'DELETE' && parts.length === 2 && parts[0] === 'tasks') {
    return {
      handler: async (req, res) => {
        const deleted = taskService.delete(parts[1]);
        if (!deleted) {
          return sendError(res, 404, 'Task not found');
        }
        res.writeHead(204);
        res.end();
      },
      params: { id: parts[1] },
    };
  }

  // PUT /tasks/:id/status
  if (
    method === 'PUT' &&
    parts.length === 3 &&
    parts[0] === 'tasks' &&
    parts[2] === 'status'
  ) {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.status) {
            return sendError(res, 400, 'status is required');
          }
          const task = taskService.changeStatus(parts[1], body.status);
          if (!task) {
            return sendError(res, 400, 'Invalid status transition');
          }
          sendJson(res, 200, task);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // PUT /tasks/:id/assign
  if (
    method === 'PUT' &&
    parts.length === 3 &&
    parts[0] === 'tasks' &&
    parts[2] === 'assign'
  ) {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.assigneeId) {
            return sendError(res, 400, 'assigneeId is required');
          }
          const task = taskService.assign(parts[1], body.assigneeId);
          if (!task) {
            return sendError(res, 404, 'Task not found');
          }
          sendJson(res, 200, task);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: { id: parts[1] },
    };
  }

  // GET /comments (with taskId query param)
  if (method === 'GET' && parts.length === 1 && parts[0] === 'comments') {
    return {
      handler: async (req, res) => {
        const url = getParsedUrl(req);
        const taskId = url.searchParams.get('taskId');
        if (!taskId) {
          return sendError(res, 400, 'taskId query parameter is required');
        }
        const comments = commentService.listByTask(taskId);
        sendJson(res, 200, comments);
      },
      params: {},
    };
  }

  // POST /comments
  if (method === 'POST' && parts.length === 1 && parts[0] === 'comments') {
    return {
      handler: async (req, res) => {
        try {
          const body = await parseBody(req);
          if (!body.taskId || !body.authorId || !body.body) {
            return sendError(
              res,
              400,
              'taskId, authorId, and body are required'
            );
          }
          // Get task and author names for event publishing
          const task = taskService.getById(body.taskId);
          const author = userService.getById(body.authorId);

          const comment = commentService.create(
            body.taskId,
            body.authorId,
            body.body,
            task?.title,
            author?.name
          );
          sendJson(res, 201, comment);
        } catch (error) {
          sendError(res, 400, 'Invalid request body');
        }
      },
      params: {},
    };
  }

  // GET /comments/:id
  if (method === 'GET' && parts.length === 2 && parts[0] === 'comments') {
    return {
      handler: async (req, res) => {
        const comment = commentService.getById(parts[1]);
        if (!comment) {
          return sendError(res, 404, 'Comment not found');
        }
        sendJson(res, 200, comment);
      },
      params: { id: parts[1] },
    };
  }

  // DELETE /comments/:id
  if (method === 'DELETE' && parts.length === 2 && parts[0] === 'comments') {
    return {
      handler: async (req, res) => {
        const deleted = commentService.delete(parts[1]);
        if (!deleted) {
          return sendError(res, 404, 'Comment not found');
        }
        res.writeHead(204);
        res.end();
      },
      params: { id: parts[1] },
    };
  }

  // GET /notifications (with userId query param)
  if (method === 'GET' && parts.length === 1 && parts[0] === 'notifications') {
    return {
      handler: async (req, res) => {
        const url = getParsedUrl(req);
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return sendError(res, 400, 'userId query parameter is required');
        }
        const notifications = notificationService.listByUser(userId);
        sendJson(res, 200, notifications);
      },
      params: {},
    };
  }

  // PUT /notifications/:id/read
  if (
    method === 'PUT' &&
    parts.length === 3 &&
    parts[0] === 'notifications' &&
    parts[2] === 'read'
  ) {
    return {
      handler: async (req, res) => {
        const notification = notificationService.markAsRead(parts[1]);
        if (!notification) {
          return sendError(res, 404, 'Notification not found');
        }
        sendJson(res, 200, notification);
      },
      params: { id: parts[1] },
    };
  }

  // No matching route
  return { handler: null, params: {} };
}

/**
 * Main router handler
 */
export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = req.method || 'GET';
  const url = getParsedUrl(req);
  const pathname = url.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const { handler, params } = matchRoute(pathname, method);

  if (!handler) {
    sendError(res, 404, 'Route not found');
    return;
  }

  try {
    await handler(req, res, params);
  } catch (error) {
    console.error('Error handling request:', error);
    sendError(res, 500, 'Internal server error');
  }
}
