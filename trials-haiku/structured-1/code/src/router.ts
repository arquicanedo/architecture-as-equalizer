/**
 * API Router: HTTP request handler
 * Routes requests to appropriate services
 * Uses Node.js built-in http module only
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';

interface ParsedRequest {
  method: string;
  pathname: string;
  query: Record<string, string>;
  body: any;
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Parse URL and body
  const parsedReq = await parseRequest(req);

  // Set response headers
  res.setHeader('Content-Type', 'application/json');

  try {
    const { method, pathname, query, body } = parsedReq;

    // Route to handlers
    if (pathname.startsWith('/users')) {
      return handleUsers(method, pathname, query, body, res);
    } else if (pathname.startsWith('/projects')) {
      return handleProjects(method, pathname, query, body, res);
    } else if (pathname.startsWith('/tasks')) {
      return handleTasks(method, pathname, query, body, res);
    } else if (pathname.startsWith('/comments')) {
      return handleComments(method, pathname, query, body, res);
    } else if (pathname.startsWith('/notifications')) {
      return handleNotifications(method, pathname, query, body, res);
    } else {
      sendResponse(res, 404, { error: 'Not found' });
    }
  } catch (error) {
    console.error('Request error:', error);
    sendResponse(res, 500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Request parsing
// ============================================================================

async function parseRequest(req: IncomingMessage): Promise<ParsedRequest> {
  const url = new URL(req.url || '', 'http://localhost');
  const method = req.method || 'GET';
  const pathname = url.pathname;
  const query: Record<string, string> = {};

  // Parse query string
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // Parse body
  let body: any = {};
  if (method !== 'GET' && method !== 'DELETE') {
    body = await readBody(req);
  }

  return { method, pathname, query, body };
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ============================================================================
// Response helpers
// ============================================================================

function sendResponse(
  res: ServerResponse,
  statusCode: number,
  data: any
): void {
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// ============================================================================
// User handlers
// ============================================================================

function handleUsers(
  method: string,
  pathname: string,
  query: Record<string, string>,
  body: any,
  res: ServerResponse
): void {
  const match = pathname.match(/^\/users\/?(.*)$/);
  const id = match?.[1] || '';

  if (method === 'GET' && !id) {
    // GET /users
    const users = userService.getAll();
    return sendResponse(res, 200, users);
  }

  if (method === 'POST' && !id) {
    // POST /users
    const { name, email } = body;
    if (!name || !email) {
      return sendResponse(res, 400, { error: 'Missing name or email' });
    }
    const user = userService.create(name, email);
    return sendResponse(res, 201, user);
  }

  if (method === 'GET' && id) {
    // GET /users/:id
    const user = userService.getById(id);
    if (!user) {
      return sendResponse(res, 404, { error: 'User not found' });
    }
    return sendResponse(res, 200, user);
  }

  if (method === 'PUT' && id) {
    // PUT /users/:id
    const user = userService.update(id, body);
    if (!user) {
      return sendResponse(res, 404, { error: 'User not found' });
    }
    return sendResponse(res, 200, user);
  }

  if (method === 'DELETE' && id) {
    // DELETE /users/:id
    const success = userService.delete(id);
    if (!success) {
      return sendResponse(res, 404, { error: 'User not found' });
    }
    return sendResponse(res, 200, { success: true });
  }

  sendResponse(res, 405, { error: 'Method not allowed' });
}

// ============================================================================
// Project handlers
// ============================================================================

function handleProjects(
  method: string,
  pathname: string,
  query: Record<string, string>,
  body: any,
  res: ServerResponse
): void {
  // Check for member operations
  const memberMatch = pathname.match(/^\/projects\/([^/]+)\/members\/?$/);
  if (memberMatch) {
    const projectId = memberMatch[1];

    if (method === 'POST') {
      // POST /projects/:id/members
      const { userId } = body;
      if (!userId) {
        return sendResponse(res, 400, { error: 'Missing userId' });
      }
      const project = projectService.addMember(projectId, userId);
      if (!project) {
        return sendResponse(res, 404, { error: 'Project not found' });
      }
      return sendResponse(res, 200, project);
    }

    if (method === 'DELETE') {
      // DELETE /projects/:id/members
      const { userId } = body;
      if (!userId) {
        return sendResponse(res, 400, { error: 'Missing userId' });
      }
      const project = projectService.removeMember(projectId, userId);
      if (!project) {
        return sendResponse(res, 404, { error: 'Project not found' });
      }
      return sendResponse(res, 200, project);
    }

    return sendResponse(res, 405, { error: 'Method not allowed' });
  }

  // Regular project operations
  const match = pathname.match(/^\/projects\/?(.*)$/);
  const id = match?.[1] || '';

  if (method === 'GET' && !id) {
    // GET /projects
    const projects = projectService.getAll();
    return sendResponse(res, 200, projects);
  }

  if (method === 'POST' && !id) {
    // POST /projects
    const { name, description } = body;
    if (!name || !description) {
      return sendResponse(res, 400, { error: 'Missing name or description' });
    }
    const project = projectService.create(name, description);
    return sendResponse(res, 201, project);
  }

  if (method === 'GET' && id) {
    // GET /projects/:id
    const project = projectService.getById(id);
    if (!project) {
      return sendResponse(res, 404, { error: 'Project not found' });
    }
    return sendResponse(res, 200, project);
  }

  if (method === 'PUT' && id) {
    // PUT /projects/:id
    const project = projectService.update(id, body);
    if (!project) {
      return sendResponse(res, 404, { error: 'Project not found' });
    }
    return sendResponse(res, 200, project);
  }

  if (method === 'DELETE' && id) {
    // DELETE /projects/:id
    const success = projectService.delete(id);
    if (!success) {
      return sendResponse(res, 404, { error: 'Project not found' });
    }
    return sendResponse(res, 200, { success: true });
  }

  sendResponse(res, 405, { error: 'Method not allowed' });
}

// ============================================================================
// Task handlers
// ============================================================================

function handleTasks(
  method: string,
  pathname: string,
  query: Record<string, string>,
  body: any,
  res: ServerResponse
): void {
  // Check for status change
  const statusMatch = pathname.match(/^\/tasks\/([^/]+)\/status\/?$/);
  if (statusMatch) {
    const taskId = statusMatch[1];
    if (method === 'PUT') {
      const { status } = body;
      if (!status) {
        return sendResponse(res, 400, { error: 'Missing status' });
      }
      try {
        const task = taskService.changeStatus(taskId, status);
        if (!task) {
          return sendResponse(res, 404, { error: 'Task not found' });
        }
        return sendResponse(res, 200, task);
      } catch (error) {
        return sendResponse(res, 400, {
          error: error instanceof Error ? error.message : 'Invalid status',
        });
      }
    }
    return sendResponse(res, 405, { error: 'Method not allowed' });
  }

  // Check for assign
  const assignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign\/?$/);
  if (assignMatch) {
    const taskId = assignMatch[1];
    if (method === 'PUT') {
      const { assigneeId } = body;
      if (!assigneeId) {
        return sendResponse(res, 400, { error: 'Missing assigneeId' });
      }
      const task = taskService.assign(taskId, assigneeId);
      if (!task) {
        return sendResponse(res, 404, { error: 'Task not found' });
      }
      return sendResponse(res, 200, task);
    }
    return sendResponse(res, 405, { error: 'Method not allowed' });
  }

  // Regular task operations
  const match = pathname.match(/^\/tasks\/?(.*)$/);
  const id = match?.[1] || '';

  if (method === 'GET' && !id) {
    // GET /tasks?projectId=X
    const projectId = query.projectId;
    if (projectId) {
      const tasks = taskService.getByProject(projectId);
      return sendResponse(res, 200, tasks);
    }
    const tasks = taskService.getAll();
    return sendResponse(res, 200, tasks);
  }

  if (method === 'POST' && !id) {
    // POST /tasks
    const { title, description, projectId } = body;
    if (!title || !description || !projectId) {
      return sendResponse(res, 400, {
        error: 'Missing title, description, or projectId',
      });
    }
    const task = taskService.create(title, description, projectId);
    return sendResponse(res, 201, task);
  }

  if (method === 'GET' && id) {
    // GET /tasks/:id
    const task = taskService.getById(id);
    if (!task) {
      return sendResponse(res, 404, { error: 'Task not found' });
    }
    return sendResponse(res, 200, task);
  }

  if (method === 'PUT' && id) {
    // PUT /tasks/:id
    const task = taskService.update(id, body);
    if (!task) {
      return sendResponse(res, 404, { error: 'Task not found' });
    }
    return sendResponse(res, 200, task);
  }

  if (method === 'DELETE' && id) {
    // DELETE /tasks/:id
    const success = taskService.delete(id);
    if (!success) {
      return sendResponse(res, 404, { error: 'Task not found' });
    }
    return sendResponse(res, 200, { success: true });
  }

  sendResponse(res, 405, { error: 'Method not allowed' });
}

// ============================================================================
// Comment handlers
// ============================================================================

function handleComments(
  method: string,
  pathname: string,
  query: Record<string, string>,
  body: any,
  res: ServerResponse
): void {
  const match = pathname.match(/^\/comments\/?(.*)$/);
  const id = match?.[1] || '';

  if (method === 'GET' && !id) {
    // GET /comments?taskId=X
    const taskId = query.taskId;
    if (taskId) {
      const comments = commentService.getByTask(taskId);
      return sendResponse(res, 200, comments);
    }
    return sendResponse(res, 400, { error: 'taskId query parameter required' });
  }

  if (method === 'POST' && !id) {
    // POST /comments
    const { taskId, authorId, body: commentBody } = body;
    if (!taskId || !authorId || !commentBody) {
      return sendResponse(res, 400, {
        error: 'Missing taskId, authorId, or body',
      });
    }
    const comment = commentService.create(taskId, authorId, commentBody);
    return sendResponse(res, 201, comment);
  }

  if (method === 'GET' && id) {
    // GET /comments/:id
    const comment = commentService.getById(id);
    if (!comment) {
      return sendResponse(res, 404, { error: 'Comment not found' });
    }
    return sendResponse(res, 200, comment);
  }

  if (method === 'DELETE' && id) {
    // DELETE /comments/:id
    const success = commentService.delete(id);
    if (!success) {
      return sendResponse(res, 404, { error: 'Comment not found' });
    }
    return sendResponse(res, 200, { success: true });
  }

  sendResponse(res, 405, { error: 'Method not allowed' });
}

// ============================================================================
// Notification handlers
// ============================================================================

function handleNotifications(
  method: string,
  pathname: string,
  query: Record<string, string>,
  body: any,
  res: ServerResponse
): void {
  // Check for read operation
  const readMatch = pathname.match(/^\/notifications\/([^/]+)\/read\/?$/);
  if (readMatch) {
    const notifId = readMatch[1];
    if (method === 'PUT') {
      const notif = notificationService.markAsRead(notifId);
      if (!notif) {
        return sendResponse(res, 404, { error: 'Notification not found' });
      }
      return sendResponse(res, 200, notif);
    }
    return sendResponse(res, 405, { error: 'Method not allowed' });
  }

  // Regular notification operations
  const match = pathname.match(/^\/notifications\/?(.*)$/);
  const id = match?.[1] || '';

  if (method === 'GET' && !id) {
    // GET /notifications?userId=X
    const userId = query.userId;
    if (userId) {
      const notifs = notificationService.getByUser(userId);
      return sendResponse(res, 200, notifs);
    }
    return sendResponse(res, 400, { error: 'userId query parameter required' });
  }

  sendResponse(res, 405, { error: 'Method not allowed' });
}
