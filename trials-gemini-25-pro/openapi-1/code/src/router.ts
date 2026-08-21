import * as http from 'http';
import { URL } from 'url';

import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

// Instantiate services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService(
    (id) => taskService.getTask(id),
    (id) => userService.getUser(id),
);
const notificationService = new NotificationService();

// --- Helper Functions ---

async function parseJSONBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: http.ServerResponse, statusCode: number, payload: any): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  sendJSON(res, statusCode, { error: message });
}

function sendNotFound(res: http.ServerResponse) {
  sendError(res, 404, 'Not Found');
}

function sendNoContent(res: http.ServerResponse) {
  res.writeHead(204);
  res.end();
}

// --- Main Request Handler ---

export const requestListener = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const { method, url } = req;
  if (!url) {
    return sendError(res, 500, 'URL is missing');
  }
  
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const path = parsedUrl.pathname;
  const query = parsedUrl.searchParams;

  try {
    // User Routes
    if (path === '/users' && method === 'GET') {
      sendJSON(res, 200, userService.listUsers());
    } else if (path === '/users' && method === 'POST') {
      const body = await parseJSONBody(req);
      const user = userService.createUser(body);
      sendJSON(res, 201, user);
    } else if (path.startsWith('/users/') && method === 'GET') {
      const id = path.split('/')[2];
      const user = userService.getUser(id);
      user ? sendJSON(res, 200, user) : sendNotFound(res);
    } else if (path.startsWith('/users/') && method === 'PUT') {
        const id = path.split('/')[2];
        const body = await parseJSONBody(req);
        const user = userService.updateUser(id, body);
        user ? sendJSON(res, 200, user) : sendNotFound(res);
    } else if (path.startsWith('/users/') && method === 'DELETE') {
        const id = path.split('/')[2];
        userService.deleteUser(id) ? sendNoContent(res) : sendNotFound(res);
    }

    // Project Routes
    else if (path === '/projects' && method === 'GET') {
        sendJSON(res, 200, projectService.listProjects());
    } else if (path === '/projects' && method === 'POST') {
        const body = await parseJSONBody(req);
        const project = projectService.createProject(body);
        sendJSON(res, 201, project);
    } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'POST') {
        const id = path.split('/')[2];
        const { userId } = await parseJSONBody(req);
        if (!userId) return sendError(res, 400, 'userId is required');
        const project = projectService.addMemberToProject(id, userId);
        project ? sendJSON(res, 200, project) : sendNotFound(res);
    } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'DELETE') {
        const id = path.split('/')[2];
        const { userId } = await parseJSONBody(req);
        if (!userId) return sendError(res, 400, 'userId is required');
        const project = projectService.removeMemberFromProject(id, userId);
        project ? sendJSON(res, 200, project) : sendNotFound(res);
    } else if (path.startsWith('/projects/') && method === 'GET') {
        const id = path.split('/')[2];
        const project = projectService.getProject(id);
        project ? sendJSON(res, 200, project) : sendNotFound(res);
    } else if (path.startsWith('/projects/') && method === 'PUT') {
        const id = path.split('/')[2];
        const body = await parseJSONBody(req);
        const project = projectService.updateProject(id, body);
        project ? sendJSON(res, 200, project) : sendNotFound(res);
    } else if (path.startsWith('/projects/') && method === 'DELETE') {
        const id = path.split('/')[2];
        projectService.deleteProject(id) ? sendNoContent(res) : sendNotFound(res);
    } 

    // Task Routes
    else if (path === '/tasks' && method === 'GET') {
        const projectId = query.get('projectId');
        if (!projectId) return sendError(res, 400, 'projectId query parameter is required');
        sendJSON(res, 200, taskService.listTasksByProject(projectId));
    } else if (path === '/tasks' && method === 'POST') {
        const body = await parseJSONBody(req);
        const task = taskService.createTask(body);
        sendJSON(res, 201, task);
    } else if (path.startsWith('/tasks/') && path.endsWith('/status') && method === 'PUT') {
        const id = path.split('/')[2];
        const { status } = await parseJSONBody(req);
        if (!status) return sendError(res, 400, 'status is required');
        const result = taskService.changeTaskStatus(id, status as TaskStatus);
        if(result === 'NOT_FOUND') return sendNotFound(res);
        if(result === 'INVALID_TRANSITION') return sendError(res, 400, 'Invalid status transition');
        sendJSON(res, 200, result);
    } else if (path.startsWith('/tasks/') && path.endsWith('/assign') && method === 'PUT') {
        const id = path.split('/')[2];
        const { assigneeId } = await parseJSONBody(req);
        if (!assigneeId) return sendError(res, 400, 'assigneeId is required');
        const task = taskService.assignTask(id, assigneeId);
        task ? sendJSON(res, 200, task) : sendNotFound(res);
    } else if (path.startsWith('/tasks/') && method === 'GET') {
        const id = path.split('/')[2];
        const task = taskService.getTask(id);
        task ? sendJSON(res, 200, task) : sendNotFound(res);
    } else if (path.startsWith('/tasks/') && method === 'PUT') {
        const id = path.split('/')[2];
        const body = await parseJSONBody(req);
        const task = taskService.updateTask(id, body);
        task ? sendJSON(res, 200, task) : sendNotFound(res);
    } else if (path.startsWith('/tasks/') && method === 'DELETE') {
        const id = path.split('/')[2];
        taskService.deleteTask(id) ? sendNoContent(res) : sendNotFound(res);
    }

    // Comment Routes
    else if (path === '/comments' && method === 'GET') {
        const taskId = query.get('taskId');
        if (!taskId) return sendError(res, 400, 'taskId query parameter is required');
        sendJSON(res, 200, commentService.listCommentsByTask(taskId));
    } else if (path === '/comments' && method === 'POST') {
        const body = await parseJSONBody(req);
        const comment = commentService.createComment(body);
        if (comment === 'TASK_NOT_FOUND' || comment === 'AUTHOR_NOT_FOUND') {
            return sendError(res, 404, `${comment}`);
        }
        sendJSON(res, 201, comment);
    } else if (path.startsWith('/comments/') && method === 'GET') {
        const id = path.split('/')[2];
        const comment = commentService.getComment(id);
        comment ? sendJSON(res, 200, comment) : sendNotFound(res);
    } else if (path.startsWith('/comments/') && method === 'DELETE') {
        const id = path.split('/')[2];
        commentService.deleteComment(id) ? sendNoContent(res) : sendNotFound(res);
    }

    // Notification Routes
    else if (path === '/notifications' && method === 'GET') {
        const userId = query.get('userId');
        if (!userId) return sendError(res, 400, 'userId query parameter is required');
        sendJSON(res, 200, notificationService.listNotificationsForUser(userId));
    } else if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
        const id = path.split('/')[2];
        const notification = notificationService.markNotificationAsRead(id);
        notification ? sendJSON(res, 200, notification) : sendNotFound(res);
    }

    // No route matched
    else {
      sendNotFound(res);
    }
  } catch (error) {
    console.error('Internal Server Error:', error);
    sendError(res, 500, 'Internal Server Error');
  }
};
