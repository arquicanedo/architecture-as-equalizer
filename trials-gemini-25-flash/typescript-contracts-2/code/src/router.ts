import * as http from 'node:http';
import * as url from 'node:url';

import {
  IUserService,
  IProjectService,
  ITaskService,
  ICommentService,
  INotificationService,
  User, Project, Task, Comment, Notification,
  TaskStatus,
} from './types';

interface Services {
  userService: IUserService;
  projectService: IProjectService;
  taskService: ITaskService;
  commentService: ICommentService;
  notificationService: INotificationService;
}

export class Router {
  private services: Services;

  constructor(services: Services) {
    this.services = services;
  }

  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        if (body) {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error('Invalid JSON body'));
          }
        } else {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  }

  private sendResponse(res: http.ServerResponse, statusCode: number, data: any) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
  }

  private sendError(res: http.ServerResponse, statusCode: number, message: string) {
    this.sendResponse(res, statusCode, { error: message });
  }

  public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const parsedUrl = url.parse(req.url || '', true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const query = parsedUrl.query;

    try {
      let body: any = {};
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        body = await this.parseBody(req);
      }

      if (path === '/users') {
        if (method === 'GET') {
          const users = this.services.userService.getAll();
          return this.sendResponse(res, 200, users);
        } else if (method === 'POST') {
          const newUser = this.services.userService.create(body);
          return this.sendResponse(res, 201, newUser);
        }
      } else if (path?.startsWith('/users/')) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const user = this.services.userService.getById(id);
          return this.sendResponse(res, 200, user);
        } else if (method === 'PUT') {
          const updatedUser = this.services.userService.update(id, body);
          return this.sendResponse(res, 200, updatedUser);
        } else if (method === 'DELETE') {
          this.services.userService.delete(id);
          return this.sendResponse(res, 204, null);
        }
      }

      else if (path === '/projects') {
        if (method === 'GET') {
          const projects = this.services.projectService.getAll();
          return this.sendResponse(res, 200, projects);
        } else if (method === 'POST') {
          const newProject = this.services.projectService.create(body);
          return this.sendResponse(res, 201, newProject);
        }
      } else if (path?.startsWith('/projects/')) {
        const parts = path.split('/');
        const id = parts[2];
        if (method === 'GET') {
          const project = this.services.projectService.getById(id);
          return this.sendResponse(res, 200, project);
        } else if (method === 'PUT') {
          const updatedProject = this.services.projectService.update(id, body);
          return this.sendResponse(res, 200, updatedProject);
        } else if (method === 'DELETE') {
          this.services.projectService.delete(id);
          return this.sendResponse(res, 204, null);
        } else if (parts[3] === 'members') {
          if (method === 'POST') {
            if (!body.userId) {
              throw new Error('userId is required');
            }
            const project = this.services.projectService.addMember(id, body.userId);
            return this.sendResponse(res, 200, project);
          } else if (method === 'DELETE') {
            if (!body.userId) {
              throw new Error('userId is required');
            }
            const project = this.services.projectService.removeMember(id, body.userId);
            return this.sendResponse(res, 200, project);
          }
        }
      }

      else if (path === '/tasks') {
        if (method === 'GET') {
          if (!query.projectId) {
            throw new Error('projectId query parameter is required');
          }
          const tasks = this.services.taskService.getByProject(query.projectId as string);
          return this.sendResponse(res, 200, tasks);
        } else if (method === 'POST') {
          const newTask = this.services.taskService.create(body);
          return this.sendResponse(res, 201, newTask);
        }
      } else if (path?.startsWith('/tasks/')) {
        const parts = path.split('/');
        const id = parts[2];
        if (method === 'GET') {
          const task = this.services.taskService.getById(id);
          return this.sendResponse(res, 200, task);
        } else if (method === 'PUT') {
          if (parts[3] === 'status') {
            if (!body.status) {
              throw new Error('status is required');
            }
            const updatedTask = this.services.taskService.changeStatus(id, body.status as TaskStatus);
            return this.sendResponse(res, 200, updatedTask);
          } else if (parts[3] === 'assign') {
            if (!body.assigneeId) {
              throw new Error('assigneeId is required');
            }
            const updatedTask = this.services.taskService.assign(id, body.assigneeId);
            return this.sendResponse(res, 200, updatedTask);
          } else {
            const updatedTask = this.services.taskService.update(id, body);
            return this.sendResponse(res, 200, updatedTask);
          }
        } else if (method === 'DELETE') {
          this.services.taskService.delete(id);
          return this.sendResponse(res, 204, null);
        }
      }

      else if (path === '/comments') {
        if (method === 'GET') {
          if (!query.taskId) {
            throw new Error('taskId query parameter is required');
          }
          const comments = this.services.commentService.getByTask(query.taskId as string);
          return this.sendResponse(res, 200, comments);
        } else if (method === 'POST') {
          const newComment = this.services.commentService.create(body);
          return this.sendResponse(res, 201, newComment);
        }
      } else if (path?.startsWith('/comments/')) {
        const id = path.split('/')[2];
        if (method === 'GET') {
          const comment = this.services.commentService.getById(id);
          return this.sendResponse(res, 200, comment);
        } else if (method === 'DELETE') {
          this.services.commentService.delete(id);
          return this.sendResponse(res, 204, null);
        }
      }

      else if (path === '/notifications') {
        if (method === 'GET') {
          if (!query.userId) {
            throw new Error('userId query parameter is required');
          }
          const notifications = this.services.notificationService.getByUser(query.userId as string);
          return this.sendResponse(res, 200, notifications);
        }
      } else if (path?.startsWith('/notifications/')) {
        const parts = path.split('/');
        const id = parts[2];
        if (parts[3] === 'read' && method === 'PUT') {
          const notification = this.services.notificationService.markAsRead(id);
          return this.sendResponse(res, 200, notification);
        }
      }

      this.sendError(res, 404, 'Not Found');
    } catch (error: any) {
      console.error('Request error:', error.message);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      this.sendError(res, statusCode, error.message);
    }
  }
}
