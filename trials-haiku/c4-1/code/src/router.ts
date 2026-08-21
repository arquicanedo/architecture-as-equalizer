/**
 * API Router - HTTP entry point
 * Delegates all requests to appropriate services
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService, CreateUserRequest, UpdateUserRequest } from './services/user-service';
import { projectService, CreateProjectRequest, UpdateProjectRequest, AddMemberRequest, RemoveMemberRequest } from './services/project-service';
import { taskService, CreateTaskRequest, UpdateTaskRequest, AssignTaskRequest, ChangeStatusRequest } from './services/task-service';
import { commentService, CreateCommentRequest } from './services/comment-service';
import { notificationService } from './services/notification-service';

/**
 * Parse JSON body from request
 */
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
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

/**
 * Send JSON response
 */
function sendResponse(
  res: ServerResponse,
  statusCode: number,
  data: any
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, message: string): void {
  sendResponse(res, statusCode, { error: message });
}

/**
 * Main router function
 */
export async function router(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';
  const searchParams = url.searchParams;

  try {
    // User routes
    if (pathname === '/users' && method === 'GET') {
      sendResponse(res, 200, userService.getAll());
      return;
    }

    if (pathname === '/users' && method === 'POST') {
      const body = await parseBody(req);
      const user = userService.create(body as CreateUserRequest);
      sendResponse(res, 201, user);
      return;
    }

    const userIdMatch = pathname.match(/^\/users\/([^/]+)$/);
    if (userIdMatch && method === 'GET') {
      const userId = userIdMatch[1];
      const user = userService.getById(userId);
      if (!user) {
        sendError(res, 404, 'User not found');
        return;
      }
      sendResponse(res, 200, user);
      return;
    }

    if (userIdMatch && method === 'PUT') {
      const userId = userIdMatch[1];
      const body = await parseBody(req);
      const user = userService.update(userId, body as UpdateUserRequest);
      if (!user) {
        sendError(res, 404, 'User not found');
        return;
      }
      sendResponse(res, 200, user);
      return;
    }

    if (userIdMatch && method === 'DELETE') {
      const userId = userIdMatch[1];
      const deleted = userService.delete(userId);
      if (!deleted) {
        sendError(res, 404, 'User not found');
        return;
      }
      sendResponse(res, 200, { message: 'User deleted' });
      return;
    }

    // Project routes
    if (pathname === '/projects' && method === 'GET') {
      sendResponse(res, 200, projectService.getAll());
      return;
    }

    if (pathname === '/projects' && method === 'POST') {
      const body = await parseBody(req);
      const project = projectService.create(body as CreateProjectRequest);
      sendResponse(res, 201, project);
      return;
    }

    const projectIdMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectIdMatch && method === 'GET') {
      const projectId = projectIdMatch[1];
      const project = projectService.getById(projectId);
      if (!project) {
        sendError(res, 404, 'Project not found');
        return;
      }
      sendResponse(res, 200, project);
      return;
    }

    if (projectIdMatch && method === 'PUT') {
      const projectId = projectIdMatch[1];
      const body = await parseBody(req);
      const project = projectService.update(projectId, body as UpdateProjectRequest);
      if (!project) {
        sendError(res, 404, 'Project not found');
        return;
      }
      sendResponse(res, 200, project);
      return;
    }

    if (projectIdMatch && method === 'DELETE') {
      const projectId = projectIdMatch[1];
      const deleted = projectService.delete(projectId);
      if (!deleted) {
        sendError(res, 404, 'Project not found');
        return;
      }
      sendResponse(res, 200, { message: 'Project deleted' });
      return;
    }

    const projectMembersMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
    if (projectMembersMatch && method === 'POST') {
      const projectId = projectMembersMatch[1];
      const body = await parseBody(req);
      const project = projectService.addMember(projectId, body.userId as string);
      if (!project) {
        sendError(res, 404, 'Project not found');
        return;
      }
      sendResponse(res, 200, project);
      return;
    }

    if (projectMembersMatch && method === 'DELETE') {
      const projectId = projectMembersMatch[1];
      const body = await parseBody(req);
      const project = projectService.removeMember(projectId, body.userId as string);
      if (!project) {
        sendError(res, 404, 'Project not found');
        return;
      }
      sendResponse(res, 200, project);
      return;
    }

    // Task routes
    if (pathname === '/tasks' && method === 'GET') {
      const projectId = searchParams.get('projectId');
      if (projectId) {
        sendResponse(res, 200, taskService.getByProject(projectId));
      } else {
        sendError(res, 400, 'projectId query parameter required');
      }
      return;
    }

    if (pathname === '/tasks' && method === 'POST') {
      const body = await parseBody(req);
      const task = taskService.create(body as CreateTaskRequest);
      sendResponse(res, 201, task);
      return;
    }

    const taskIdMatch = pathname.match(/^\/tasks\/([^/]+)$/);
    if (taskIdMatch && method === 'GET') {
      const taskId = taskIdMatch[1];
      const task = taskService.getById(taskId);
      if (!task) {
        sendError(res, 404, 'Task not found');
        return;
      }
      sendResponse(res, 200, task);
      return;
    }

    if (taskIdMatch && method === 'PUT') {
      const taskId = taskIdMatch[1];
      const body = await parseBody(req);
      const task = taskService.update(taskId, body as UpdateTaskRequest);
      if (!task) {
        sendError(res, 404, 'Task not found');
        return;
      }
      sendResponse(res, 200, task);
      return;
    }

    if (taskIdMatch && method === 'DELETE') {
      const taskId = taskIdMatch[1];
      const deleted = taskService.delete(taskId);
      if (!deleted) {
        sendError(res, 404, 'Task not found');
        return;
      }
      sendResponse(res, 200, { message: 'Task deleted' });
      return;
    }

    const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
    if (taskStatusMatch && method === 'PUT') {
      const taskId = taskStatusMatch[1];
      const body = await parseBody(req);
      try {
        const task = taskService.changeStatus(taskId, body as ChangeStatusRequest);
        if (!task) {
          sendError(res, 404, 'Task not found');
          return;
        }
        sendResponse(res, 200, task);
      } catch (error) {
        sendError(res, 400, (error as Error).message);
      }
      return;
    }

    const taskAssignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
    if (taskAssignMatch && method === 'PUT') {
      const taskId = taskAssignMatch[1];
      const body = await parseBody(req);
      const task = taskService.assign(taskId, body as AssignTaskRequest);
      if (!task) {
        sendError(res, 404, 'Task not found');
        return;
      }
      sendResponse(res, 200, task);
      return;
    }

    // Comment routes
    if (pathname === '/comments' && method === 'GET') {
      const taskId = searchParams.get('taskId');
      if (taskId) {
        sendResponse(res, 200, commentService.getByTask(taskId));
      } else {
        sendError(res, 400, 'taskId query parameter required');
      }
      return;
    }

    if (pathname === '/comments' && method === 'POST') {
      const body = await parseBody(req);
      const task = taskService.getById(body.taskId);
      if (!task) {
        sendError(res, 404, 'Task not found');
        return;
      }
      const comment = commentService.create(body as CreateCommentRequest, task.title);
      sendResponse(res, 201, comment);
      return;
    }

    const commentIdMatch = pathname.match(/^\/comments\/([^/]+)$/);
    if (commentIdMatch && method === 'GET') {
      const commentId = commentIdMatch[1];
      const comment = commentService.getById(commentId);
      if (!comment) {
        sendError(res, 404, 'Comment not found');
        return;
      }
      sendResponse(res, 200, comment);
      return;
    }

    if (commentIdMatch && method === 'DELETE') {
      const commentId = commentIdMatch[1];
      const deleted = commentService.delete(commentId);
      if (!deleted) {
        sendError(res, 404, 'Comment not found');
        return;
      }
      sendResponse(res, 200, { message: 'Comment deleted' });
      return;
    }

    // Notification routes
    if (pathname === '/notifications' && method === 'GET') {
      const userId = searchParams.get('userId');
      if (userId) {
        sendResponse(res, 200, notificationService.getByUser(userId));
      } else {
        sendError(res, 400, 'userId query parameter required');
      }
      return;
    }

    const notificationIdMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
    if (notificationIdMatch && method === 'PUT') {
      const notificationId = notificationIdMatch[1];
      const notification = notificationService.markAsRead(notificationId);
      if (!notification) {
        sendError(res, 404, 'Notification not found');
        return;
      }
      sendResponse(res, 200, notification);
      return;
    }

    // 404
    sendError(res, 404, 'Not found');
  } catch (error) {
    console.error('Router error:', error);
    sendError(res, 500, 'Internal server error');
  }
}
