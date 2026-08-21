
import * as http from 'http';
import * as url from 'url';
import { IUserService, IProjectService, ITaskService, ICommentService, INotificationService } from './contracts';

// Helper to parse body
async function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
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

    public async handle(req: http.IncomingMessage, res: http.ServerResponse) {
        const { pathname, query } = url.parse(req.url!, true);
        const method = req.method?.toUpperCase();
        res.setHeader('Content-Type', 'application/json');

        try {
            // User Routes
            if (pathname === '/users') {
                if (method === 'GET') {
                    const users = this.userService.getAll();
                    res.statusCode = 200;
                    res.end(JSON.stringify(users));
                } else if (method === 'POST') {
                    const body = await parseBody(req);
                    const user = this.userService.create(body);
                    res.statusCode = 201;
                    res.end(JSON.stringify(user));
                }
            } else if (pathname?.startsWith('/users/')) {
                const id = pathname.split('/')[2];
                if (method === 'GET') {
                    const user = this.userService.getById(id);
                    if(!user) throw new Error('User not found');
                    res.statusCode = 200;
                    res.end(JSON.stringify(user));
                } else if (method === 'PUT') {
                    const body = await parseBody(req);
                    const user = this.userService.update(id, body);
                    res.statusCode = 200;
                    res.end(JSON.stringify(user));
                } else if (method === 'DELETE') {
                    this.userService.delete(id);
                    res.statusCode = 204;
                    res.end();
                }
            }

            // Project Routes
            else if (pathname === '/projects') {
                if (method === 'GET') {
                    res.statusCode = 200;
                    res.end(JSON.stringify(this.projectService.getAll()));
                } else if (method === 'POST') {
                    const body = await parseBody(req);
                    const project = this.projectService.create(body);
                    res.statusCode = 201;
                    res.end(JSON.stringify(project));
                }
            } else if (pathname?.startsWith('/projects/')) {
                const id = pathname.split('/')[2];
                if (pathname.endsWith('/members')) {
                     const body = await parseBody(req);
                    if (method === 'POST') {
                       const project = this.projectService.addMember(id, body.userId);
                       res.statusCode = 200;
                       res.end(JSON.stringify(project));
                    } else if (method === 'DELETE') {
                       const project = this.projectService.removeMember(id, body.userId);
                       res.statusCode = 200;
                       res.end(JSON.stringify(project));
                    }
                } else {
                    if (method === 'GET') {
                        const project = this.projectService.getById(id);
                        if(!project) throw new Error('Project not found');
                        res.statusCode = 200;
                        res.end(JSON.stringify(project));
                    } else if (method === 'PUT') {
                        const body = await parseBody(req);
                        const project = this.projectService.update(id, body);
                        res.statusCode = 200;
                        res.end(JSON.stringify(project));
                    } else if (method === 'DELETE') {
                        this.projectService.delete(id);
                        res.statusCode = 204;
                        res.end();
                    }
                }
            }
            
            // Task Routes
            else if (pathname === '/tasks') {
                 if (method === 'GET' && query.projectId) {
                    const tasks = this.taskService.getByProject(query.projectId as string);
                    res.statusCode = 200;
                    res.end(JSON.stringify(tasks));
                } else if (method === 'POST') {
                    const body = await parseBody(req);
                    const task = this.taskService.create(body);
                    res.statusCode = 201;
                    res.end(JSON.stringify(task));
                }
            } else if (pathname?.startsWith('/tasks/')) {
                 const id = pathname.split('/')[2];
                 if (pathname.endsWith('/status')) {
                     if (method === 'PUT') {
                         const body = await parseBody(req);
                         const task = this.taskService.changeStatus(id, body.status);
                         res.statusCode = 200;
                         res.end(JSON.stringify(task));
                     }
                 } else if (pathname.endsWith('/assign')) {
                      if (method === 'PUT') {
                         const body = await parseBody(req);
                         const task = this.taskService.assign(id, body.assigneeId);
                         res.statusCode = 200;
                         res.end(JSON.stringify(task));
                      }
                 } else {
                     if (method === 'GET') {
                         const task = this.taskService.getById(id);
                         if(!task) throw new Error('Task not found');
                         res.statusCode = 200;
                         res.end(JSON.stringify(task));
                     } else if (method === 'PUT') {
                         const body = await parseBody(req);
                         const task = this.taskService.update(id, body);
                         res.statusCode = 200;
                         res.end(JSON.stringify(task));
                     } else if (method === 'DELETE') {
                         this.taskService.delete(id);
                         res.statusCode = 204;
                         res.end();
                     }
                 }
            }
            
            // Comment Routes
            else if (pathname === '/comments') {
                if (method === 'GET' && query.taskId) {
                    const comments = this.commentService.getByTask(query.taskId as string);
                    res.statusCode = 200;
                    res.end(JSON.stringify(comments));
                } else if (method === 'POST') {
                    const body = await parseBody(req);
                    const comment = this.commentService.create(body);
                    res.statusCode = 201;
                    res.end(JSON.stringify(comment));
                }
            } else if (pathname?.startsWith('/comments/')) {
                const id = pathname.split('/')[2];
                if (method === 'GET') {
                    const comment = this.commentService.getById(id);
                    if(!comment) throw new Error('Comment not found');
                    res.statusCode = 200;
                    res.end(JSON.stringify(comment));
                } else if (method === 'DELETE') {
                    this.commentService.delete(id);
                    res.statusCode = 204;
                    res.end();
                }
            }
            
            // Notification Routes
            else if (pathname === '/notifications' && query.userId) {
                if (method === 'GET') {
                    const notifications = this.notificationService.getByUser(query.userId as string);
                    res.statusCode = 200;
                    res.end(JSON.stringify(notifications));
                }
            } else if (pathname?.startsWith('/notifications/')) {
                 const id = pathname.split('/')[2];
                 if(pathname.endsWith('/read') && method === 'PUT') {
                     const notification = this.notificationService.markAsRead(id);
                     res.statusCode = 200;
                     res.end(JSON.stringify(notification));
                 }
            }
            
            else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not Found' }));
            }

        } catch (error: any) {
            console.error(error);
            res.statusCode = error.message.includes('not found') ? 404 : 400;
            res.end(JSON.stringify({ error: error.message }));
        }
    }
}
