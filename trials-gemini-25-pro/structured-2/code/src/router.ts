
import * as http from 'http';
import * as url from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

export class Router {
    constructor(
        private userService: UserService,
        private projectService: ProjectService,
        private taskService: TaskService,
        private commentService: CommentService,
        private notificationService: NotificationService
    ) {}

    public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const { pathname, query } = url.parse(req.url || '', true);
        const method = req.method;

        res.setHeader('Content-Type', 'application/json');

        try {
            // User routes
            if (pathname === '/users') {
                if (method === 'GET') {
                    const users = this.userService.getAll();
                    this.sendResponse(res, 200, users);
                } else if (method === 'POST') {
                    const body = await this.parseBody(req);
                    const newUser = this.userService.create(body);
                    this.sendResponse(res, 201, newUser);
                }
            } else if (pathname?.match(/^\/users\/([a-zA-Z0-9-]+)$/)) {
                const id = pathname.split('/')[2];
                if (method === 'GET') {
                    const user = this.userService.getById(id);
                    if (user) this.sendResponse(res, 200, user);
                    else this.sendResponse(res, 404, { message: 'User not found' });
                } else if (method === 'PUT') {
                    const body = await this.parseBody(req);
                    const updatedUser = this.userService.update(id, body);
                    if (updatedUser) this.sendResponse(res, 200, updatedUser);
                    else this.sendResponse(res, 404, { message: 'User not found' });
                } else if (method === 'DELETE') {
                    if (this.userService.delete(id)) this.sendResponse(res, 204);
                    else this.sendResponse(res, 404, { message: 'User not found' });
                }
            }

            // Project routes
            else if (pathname === '/projects') {
                if (method === 'GET') {
                    this.sendResponse(res, 200, this.projectService.getAll());
                } else if (method === 'POST') {
                    const body = await this.parseBody(req);
                    const newProject = this.projectService.create(body);
                    this.sendResponse(res, 201, newProject);
                }
            } else if (pathname?.match(/^\/projects\/([a-zA-Z0-9-]+)$/)) {
                const id = pathname.split('/')[2];
                if (method === 'GET') {
                    const project = this.projectService.getById(id);
                    if (project) this.sendResponse(res, 200, project);
                    else this.sendResponse(res, 404, { message: 'Project not found' });
                } else if (method === 'PUT') {
                    const body = await this.parseBody(req);
                    const updatedProject = this.projectService.update(id, body);
                    if (updatedProject) this.sendResponse(res, 200, updatedProject);
                    else this.sendResponse(res, 404, { message: 'Project not found' });
                } else if (method === 'DELETE') {
                    if (this.projectService.delete(id)) this.sendResponse(res, 204);
                    else this.sendResponse(res, 404, { message: 'Project not found' });
                }
            } else if (pathname?.match(/^\/projects\/([a-zA-Z0-9-]+)\/members$/)) {
                const id = pathname.split('/')[2];
                const body = await this.parseBody(req);
                if (method === 'POST') {
                    const project = this.projectService.addMember(id, body.memberId);
                    if (project) this.sendResponse(res, 200, project);
                    else this.sendResponse(res, 404, { message: 'Project not found' });
                } else if (method === 'DELETE') {
                    const project = this.projectService.removeMember(id, body.memberId);
                    if (project) this.sendResponse(res, 200, project);
                    else this.sendResponse(res, 404, { message: 'Project not found' });
                }
            }

            // Task routes
            else if (pathname === '/tasks') {
                if (method === 'GET' && query.projectId) {
                    this.sendResponse(res, 200, this.taskService.getByProject(query.projectId as string));
                } else if (method === 'POST') {
                    const body = await this.parseBody(req);
                    const newTask = this.taskService.create(body);
                    this.sendResponse(res, 201, newTask);
                }
            } else if (pathname?.match(/^\/tasks\/([a-zA-Z0-9-]+)$/)) {
                const id = pathname.split('/')[2];
                 if (method === 'GET') {
                    const task = this.taskService.getById(id);
                    if (task) this.sendResponse(res, 200, task);
                    else this.sendResponse(res, 404, { message: 'Task not found' });
                } else if (method === 'PUT') {
                    const body = await this.parseBody(req);
                    const updatedTask = this.taskService.update(id, body);
                    if (updatedTask) this.sendResponse(res, 200, updatedTask);
                     else this.sendResponse(res, 404, { message: 'Task not found' });
                } else if (method === 'DELETE') {
                    if (this.taskService.delete(id)) this.sendResponse(res, 204);
                    else this.sendResponse(res, 404, { message: 'Task not found' });
                }
            } else if (pathname?.match(/^\/tasks\/([a-zA-Z0-9-]+)\/status$/)) {
                const id = pathname.split('/')[2];
                if (method === 'PUT') {
                    const body = await this.parseBody(req);
                    const updatedTask = this.taskService.changeStatus(id, body.status as TaskStatus);
                    if (updatedTask) this.sendResponse(res, 200, updatedTask);
                    else this.sendResponse(res, 400, { message: 'Invalid status transition or task not found' });
                }
            } else if (pathname?.match(/^\/tasks\/([a-zA-Z0-9-]+)\/assign$/)) {
                 const id = pathname.split('/')[2];
                if (method === 'PUT') {
                    const body = await this.parseBody(req);
                    const updatedTask = this.taskService.assign(id, body.assigneeId);
                    if (updatedTask) this.sendResponse(res, 200, updatedTask);
                    else this.sendResponse(res, 404, { message: 'Task not found' });
                }
            }
            
            // Comment routes
            else if (pathname === '/comments') {
                if (method === 'GET' && query.taskId) {
                    this.sendResponse(res, 200, this.commentService.getByTask(query.taskId as string));
                } else if (method === 'POST') {
                    const body = await this.parseBody(req);
                    const { taskId, authorId } = body;
                    const task = this.taskService.getById(taskId);
                    const author = this.userService.getById(authorId);

                    if (!task || !author) {
                        this.sendResponse(res, 404, { message: 'Task or Author not found' });
                        return;
                    }

                    const newComment = this.commentService.create(body, {
                        taskTitle: task.title,
                        authorName: author.name,
                        taskAssigneeId: task.assigneeId
                    });
                    this.sendResponse(res, 201, newComment);
                }
            } else if (pathname?.match(/^\/comments\/([a-zA-Z0-9-]+)$/)) {
                const id = pathname.split('/')[2];
                if (method === 'GET') {
                    const comment = this.commentService.getById(id);
                    if (comment) this.sendResponse(res, 200, comment);
                    else this.sendResponse(res, 404, { message: 'Comment not found' });
                } else if (method === 'DELETE') {
                    if (this.commentService.delete(id)) this.sendResponse(res, 204);
                    else this.sendResponse(res, 404, { message: 'Comment not found' });
                }
            }

            // Notification routes
            else if (pathname === '/notifications' && query.userId) {
                if (method === 'GET') {
                    this.sendResponse(res, 200, this.notificationService.getByUser(query.userId as string));
                }
            } else if (pathname?.match(/^\/notifications\/([a-zA-Z0-9-]+)\/read$/)) {
                const id = pathname.split('/')[2];
                if (method === 'PUT') {
                    const notification = this.notificationService.markAsRead(id);
                    if (notification) this.sendResponse(res, 200, notification);
                    else this.sendResponse(res, 404, { message: 'Notification not found' });
                }
            }

            // Fallback for unhandled routes
            else {
                this.sendResponse(res, 404, { message: 'Not Found' });
            }
        } catch (error) {
            console.error('Internal Server Error:', error);
            this.sendResponse(res, 500, { message: 'Internal Server Error' });
        }
    }

    private parseBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk: any) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body || '{}'));
                } catch (e) {
                    reject(e);
                }
            });
            req.on('error', reject);
        });
    }

    private sendResponse(res: http.ServerResponse, statusCode: number, data?: any): void {
        res.statusCode = statusCode;
        if (data) {
            res.end(JSON.stringify(data));
        } else {
            res.end();
        }
    }
}
