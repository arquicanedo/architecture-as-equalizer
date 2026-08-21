import * as http from 'http';
import * as url from 'url';
import { ICommentService, IProjectService, ITaskService, IUserService, INotificationService } from './contracts';

function parseJSONBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
    });
}

export class ApiRouter {
    constructor(
        private userService: IUserService,
        private projectService: IProjectService,
        private taskService: ITaskService,
        private commentService: ICommentService,
        private notificationService: INotificationService
    ) {}

    public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const { pathname, query } = url.parse(req.url!, true);
        const method = req.method?.toUpperCase();

        res.setHeader('Content-Type', 'application/json');

        try {
            // User routes
            if (pathname === '/users' && method === 'GET') {
                const users = this.userService.getAll();
                res.statusCode = 200;
                res.end(JSON.stringify(users));
            } else if (pathname === '/users' && method === 'POST') {
                const body = await parseJSONBody(req);
                const user = this.userService.create(body);
                res.statusCode = 201;
                res.end(JSON.stringify(user));
            } else if (pathname?.match(/^\/users\/(\w+)$/) && method === 'GET') {
                const id = pathname.split('/')[2];
                const user = this.userService.getById(id);
                res.statusCode = 200;
                res.end(JSON.stringify(user));
            } else if (pathname?.match(/^\/users\/(\w+)$/) && method === 'PUT') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const user = this.userService.update(id, body);
                res.statusCode = 200;
                res.end(JSON.stringify(user));
            } else if (pathname?.match(/^\/users\/(\w+)$/) && method === 'DELETE') {
                const id = pathname.split('/')[2];
                this.userService.delete(id);
                res.statusCode = 204;
                res.end();
            }
            // Project routes
            else if (pathname === '/projects' && method === 'GET') {
                const projects = this.projectService.getAll();
                res.statusCode = 200;
                res.end(JSON.stringify(projects));
            } else if (pathname === '/projects' && method === 'POST') {
                const body = await parseJSONBody(req);
                const project = this.projectService.create(body);
                res.statusCode = 201;
                res.end(JSON.stringify(project));
            } else if (pathname?.match(/^\/projects\/([\w-]+)$/) && method === 'GET') {
                const id = pathname.split('/')[2];
                const project = this.projectService.getById(id);
                res.statusCode = 200;
                res.end(JSON.stringify(project));
            } else if (pathname?.match(/^\/projects\/([\w-]+)$/) && method === 'PUT') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const project = this.projectService.update(id, body);
                res.statusCode = 200;
                res.end(JSON.stringify(project));
            } else if (pathname?.match(/^\/projects\/([\w-]+)$/) && method === 'DELETE') {
                const id = pathname.split('/')[2];
                this.projectService.delete(id);
                res.statusCode = 204;
                res.end();
            } else if (pathname?.match(/^\/projects\/([\w-]+)\/members$/) && method === 'POST') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const project = this.projectService.addMember(id, body.userId);
                res.statusCode = 200;
                res.end(JSON.stringify(project));
            } else if (pathname?.match(/^\/projects\/([\w-]+)\/members$/) && method === 'DELETE') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const project = this.projectService.removeMember(id, body.userId);
                res.statusCode = 200;
                res.end(JSON.stringify(project));
            }
            // Task routes
            else if (pathname === '/tasks' && method === 'GET') {
                if (query.projectId) {
                    const tasks = this.taskService.getByProject(query.projectId as string);
                    res.statusCode = 200;
                    res.end(JSON.stringify(tasks));
                } else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ message: 'projectId query parameter is required' }));
                }
            } else if (pathname === '/tasks' && method === 'POST') {
                const body = await parseJSONBody(req);
                const task = this.taskService.create(body);
                res.statusCode = 201;
                res.end(JSON.stringify(task));
            } else if (pathname?.match(/^\/tasks\/([\w-]+)$/) && method === 'GET') {
                const id = pathname.split('/')[2];
                const task = this.taskService.getById(id);
                res.statusCode = 200;
                res.end(JSON.stringify(task));
            } else if (pathname?.match(/^\/tasks\/([\w-]+)$/) && method === 'PUT') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const task = this.taskService.update(id, body);
                res.statusCode = 200;
                res.end(JSON.stringify(task));
            } else if (pathname?.match(/^\/tasks\/([\w-]+)$/) && method === 'DELETE') {
                const id = pathname.split('/')[2];
                this.taskService.delete(id);
                res.statusCode = 204;
                res.end();
            } else if (pathname?.match(/^\/tasks\/([\w-]+)\/status$/) && method === 'PUT') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const task = this.taskService.changeStatus(id, body.status);
                res.statusCode = 200;
                res.end(JSON.stringify(task));
            } else if (pathname?.match(/^\/tasks\/([\w-]+)\/assign$/) && method === 'PUT') {
                const id = pathname.split('/')[2];
                const body = await parseJSONBody(req);
                const task = this.taskService.assign(id, body.assigneeId);
                res.statusCode = 200;
                res.end(JSON.stringify(task));
            }
            // Comment routes
            else if (pathname === '/comments' && method === 'GET') {
                if (query.taskId) {
                    const comments = this.commentService.getByTask(query.taskId as string);
                    res.statusCode = 200;
                    res.end(JSON.stringify(comments));
                } else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ message: 'taskId query parameter is required' }));
                }
            } else if (pathname === '/comments' && method === 'POST') {
                const body = await parseJSONBody(req);
                const comment = this.commentService.create(body);
                res.statusCode = 201;
                res.end(JSON.stringify(comment));
            } else if (pathname?.match(/^\/comments\/([\w-]+)$/) && method === 'GET') {
                const id = pathname.split('/')[2];
                const comment = this.commentService.getById(id);
                res.statusCode = 200;
                res.end(JSON.stringify(comment));
            } else if (pathname?.match(/^\/comments\/([\w-]+)$/) && method === 'DELETE') {
                const id = pathname.split('/')[2];
                this.commentService.delete(id);
                res.statusCode = 204;
                res.end();
            }
            // Notification routes
            else if (pathname === '/notifications' && method === 'GET') {
                if (query.userId) {
                    const notifications = this.notificationService.getByUser(query.userId as string);
                    res.statusCode = 200;
                    res.end(JSON.stringify(notifications));
                } else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ message: 'userId query parameter is required' }));
                }
            } else if (pathname?.match(/^\/notifications\/([\w-]+)\/read$/) && method === 'PUT') {
                const id = pathname.split('/')[2];
                const notification = this.notificationService.markAsRead(id);
                res.statusCode = 200;
                res.end(JSON.stringify(notification));
            }
            // Not found
            else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Not Found' }));
            }
        } catch (error: any) {
            res.statusCode = 400; // Bad Request, could be 500 for server errors
            res.end(JSON.stringify({ message: error.message }));
        }
    }
}
