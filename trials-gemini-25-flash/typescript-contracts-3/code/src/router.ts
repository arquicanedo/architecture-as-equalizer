import * as http from 'node:http';
import * as url from 'node:url';
import { 
  IUserService, 
  IProjectService, 
  ITaskService, 
  ICommentService, 
  INotificationService, 
  TaskStatus,
} from './types';

interface RouteHandler {
  (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>): Promise<void>;
}

interface Route {
  method: string;
  regex: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

export class ApiRouter {
  private routes: Route[] = [];
  private userService: IUserService;
  private projectService: IProjectService;
  private taskService: ITaskService;
  private commentService: ICommentService;
  private notificationService: INotificationService;

  constructor(
    userService: IUserService,
    projectService: IProjectService,
    taskService: ITaskService,
    commentService: ICommentService,
    notificationService: INotificationService
  ) {
    this.userService = userService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.commentService = commentService;
    this.notificationService = notificationService;
    this.registerRoutes();
  }

  private registerRoute(method: string, path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const regexPath = path.replace(/\/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '\/([a-zA-Z0-9_-]+)';
    });
    this.routes.push({
      method,
      regex: new RegExp(`^${regexPath}/?$`),
      handler,
      paramNames,
    });
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
      req.on('error', err => {
        reject(err);
      });
    });
  }

  public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    const query = parsedUrl.query as Record<string, string>;

    res.setHeader('Content-Type', 'application/json');

    for (const route of this.routes) {
      const match = req.method === route.method && pathname.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match![index + 1];
        });

        try {
          const body = await this.parseBody(req);
          await route.handler(req, res, params, query);
        } catch (error: any) {
          if (error.message.includes('not found')) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: error.message }));
          } else if (error.message.includes('Invalid') || error.message.includes('cannot change task from')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: error.message }));
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
        }
        return;
      }
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  }

  private registerRoutes(): void {
    // Users
    this.registerRoute('GET', '/users', async (req, res) => {
      const users = this.userService.getAll();
      res.end(JSON.stringify(users));
    });
    this.registerRoute('POST', '/users', async (req, res, params, query) => {
      const body = await this.parseBody(req);
      const user = this.userService.create(body);
      res.statusCode = 201;
      res.end(JSON.stringify(user));
    });
    this.registerRoute('GET', '/users/:id', async (req, res, params) => {
      const user = this.userService.getById(params.id);
      res.end(JSON.stringify(user));
    });
    this.registerRoute('PUT', '/users/:id', async (req, res, params) => {
      const body = await this.parseBody(req);
      const user = this.userService.update(params.id, body);
      res.end(JSON.stringify(user));
    });
    this.registerRoute('DELETE', '/users/:id', async (req, res, params) => {
      this.userService.delete(params.id);
      res.statusCode = 204;
      res.end();
    });

    // Projects
    this.registerRoute('GET', '/projects', async (req, res) => {
      const projects = this.projectService.getAll();
      res.end(JSON.stringify(projects));
    });
    this.registerRoute('POST', '/projects', async (req, res) => {
      const body = await this.parseBody(req);
      const project = this.projectService.create(body);
      res.statusCode = 201;
      res.end(JSON.stringify(project));
    });
    this.registerRoute('GET', '/projects/:id', async (req, res, params) => {
      const project = this.projectService.getById(params.id);
      res.end(JSON.stringify(project));
    });
    this.registerRoute('PUT', '/projects/:id', async (req, res, params) => {
      const body = await this.parseBody(req);
      const project = this.projectService.update(params.id, body);
      res.end(JSON.stringify(project));
    });
    this.registerRoute('DELETE', '/projects/:id', async (req, res, params) => {
      this.projectService.delete(params.id);
      res.statusCode = 204;
      res.end();
    });
    this.registerRoute('POST', '/projects/:id/members', async (req, res, params) => {
      const body = await this.parseBody(req);
      const project = this.projectService.addMember(params.id, body.userId);
      res.end(JSON.stringify(project));
    });
    this.registerRoute('DELETE', '/projects/:id/members', async (req, res, params) => {
      const body = await this.parseBody(req);
      const project = this.projectService.removeMember(params.id, body.userId);
      res.end(JSON.stringify(project));
    });

    // Tasks
    this.registerRoute('GET', '/tasks', async (req, res, params, query) => {
      if (query.projectId) {
        const tasks = this.taskService.getByProject(query.projectId);
        res.end(JSON.stringify(tasks));
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'projectId query parameter is required' }));
      }
    });
    this.registerRoute('POST', '/tasks', async (req, res) => {
      const body = await this.parseBody(req);
      const task = this.taskService.create(body);
      res.statusCode = 201;
      res.end(JSON.stringify(task));
    });
    this.registerRoute('GET', '/tasks/:id', async (req, res, params) => {
      const task = this.taskService.getById(params.id);
      res.end(JSON.stringify(task));
    });
    this.registerRoute('PUT', '/tasks/:id', async (req, res, params) => {
      const body = await this.parseBody(req);
      const task = this.taskService.update(params.id, body);
      res.end(JSON.stringify(task));
    });
    this.registerRoute('DELETE', '/tasks/:id', async (req, res, params) => {
      this.taskService.delete(params.id);
      res.statusCode = 204;
      res.end();
    });
    this.registerRoute('PUT', '/tasks/:id/status', async (req, res, params) => {
      const body = await this.parseBody(req);
      const task = this.taskService.changeStatus(params.id, body.status as TaskStatus);
      res.end(JSON.stringify(task));
    });
    this.registerRoute('PUT', '/tasks/:id/assign', async (req, res, params) => {
      const body = await this.parseBody(req);
      const task = this.taskService.assign(params.id, body.assigneeId);
      res.end(JSON.stringify(task));
    });

    // Comments
    this.registerRoute('GET', '/comments', async (req, res, params, query) => {
      if (query.taskId) {
        const comments = this.commentService.getByTask(query.taskId);
        res.end(JSON.stringify(comments));
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'taskId query parameter is required' }));
      }
    });
    this.registerRoute('POST', '/comments', async (req, res) => {
      const body = await this.parseBody(req);
      const comment = this.commentService.create(body);
      res.statusCode = 201;
      res.end(JSON.stringify(comment));
    });
    this.registerRoute('GET', '/comments/:id', async (req, res, params) => {
      const comment = this.commentService.getById(params.id);
      res.end(JSON.stringify(comment));
    });
    this.registerRoute('DELETE', '/comments/:id', async (req, res, params) => {
      this.commentService.delete(params.id);
      res.statusCode = 204;
      res.end();
    });

    // Notifications
    this.registerRoute('GET', '/notifications', async (req, res, params, query) => {
      if (query.userId) {
        const notifications = this.notificationService.getByUser(query.userId);
        res.end(JSON.stringify(notifications));
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'userId query parameter is required' }));
      }
    });
    this.registerRoute('PUT', '/notifications/:id/read', async (req, res, params) => {
      const notification = this.notificationService.markAsRead(params.id);
      res.end(JSON.stringify(notification));
    });
  }
}
