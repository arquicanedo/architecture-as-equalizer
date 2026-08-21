import * as http from 'http';
import { URL } from 'url';

import { UserService, User } from './services/user-service';
import { ProjectService, Project } from './services/project-service';
import { TaskService, Task, TaskStatus } from './services/task-service';
import { CommentService, Comment } from './services/comment-service';
import { NotificationService, Notification } from './services/notification-service';

interface ServiceRegistry {
    userService: UserService;
    projectService: ProjectService;
    taskService: TaskService;
    commentService: CommentService;
    notificationService: NotificationService;
}

export class ApiRouter {
    private services: ServiceRegistry;

    constructor(services: ServiceRegistry) {
        this.services = services;
    }

    public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const method = req.method;
        const path = url.pathname;
        const queryParams = url.searchParams;

        res.setHeader('Content-Type', 'application/json');

        let body: any;
        try {
            body = await this.parseRequestBody(req);
        } catch (error) {
            console.error('Error parsing request body:', error);
            return this.sendError(res, 400, 'Invalid JSON body');
        }

        // Routing logic
        try {
            if (path.startsWith('/users')) {
                await this.handleUserRoutes(req, res, path, method, body);
            } else if (path.startsWith('/projects')) {
                await this.handleProjectRoutes(req, res, path, method, body);
            } else if (path.startsWith('/tasks')) {
                await this.handleTaskRoutes(req, res, path, method, body, queryParams);
            } else if (path.startsWith('/comments')) {
                await this.handleCommentRoutes(req, res, path, method, body, queryParams);
            } else if (path.startsWith('/notifications')) {
                await this.handleNotificationRoutes(req, res, path, method, body, queryParams);
            } else {
                this.sendError(res, 404, 'Not Found');
            }
        } catch (error: any) {
            console.error('Unhandled route error:', error);
            this.sendError(res, 500, 'Internal Server Error', error.message);
        }
    }

    private parseRequestBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            if (req.method === 'GET' || req.method === 'DELETE') {
                return resolve(null);
            }
            let data = '';
            req.on('data', chunk => {
                data += chunk;
            });
            req.on('end', () => {
                if (data) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    resolve(null);
                }
            });
            req.on('error', err => {
                reject(err);
            });
        });
    }

    private sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
        res.writeHead(statusCode);
        res.end(JSON.stringify(data));
    }

    private sendError(res: http.ServerResponse, statusCode: number, message: string, detail?: string): void {
        res.writeHead(statusCode);
        res.end(JSON.stringify({ error: message, detail }));
    }

    // --- User Routes ---
    private async handleUserRoutes(req: http.IncomingMessage, res: http.ServerResponse, path: string, method: string, body: any): Promise<void> {
        const idMatch = path.match(/^\/users\/([a-f0-9-]+)$/);

        if (method === 'GET' && path === '/users') {
            const users = this.services.userService.getAll();
            return this.sendResponse(res, 200, users);
        } else if (method === 'POST' && path === '/users') {
            if (!body || !body.name || !body.email) {
                return this.sendError(res, 400, 'Name and email are required');
            }
            const newUser = this.services.userService.create(body.name, body.email);
            if (!newUser) {
                return this.sendError(res, 409, 'User with this email already exists');
            }
            return this.sendResponse(res, 201, newUser);
        } else if (idMatch) {
            const userId = idMatch[1];
            if (method === 'GET') {
                const user = this.services.userService.getById(userId);
                if (!user) return this.sendError(res, 404, 'User not found');
                return this.sendResponse(res, 200, user);
            } else if (method === 'PUT') {
                if (!body || (!body.name && !body.email)) {
                    return this.sendError(res, 400, 'Name or email required for update');
                }
                const updatedUser = this.services.userService.update(userId, body);
                if (!updatedUser) {
                    return this.sendError(res, 404, 'User not found or email already in use');
                }
                return this.sendResponse(res, 200, updatedUser);
            } else if (method === 'DELETE') {
                const success = this.services.userService.delete(userId);
                if (!success) return this.sendError(res, 404, 'User not found');
                return this.sendResponse(res, 204, null);
            }
        }
        this.sendError(res, 405, 'Method Not Allowed');
    }

    // --- Project Routes ---
    private async handleProjectRoutes(req: http.IncomingMessage, res: http.ServerResponse, path: string, method: string, body: any): Promise<void> {
        const idMatch = path.match(/^\/projects\/([a-f0-9-]+)$/);
        const memberMatch = path.match(/^\/projects\/([a-f0-9-]+)\/members$/);

        if (method === 'GET' && path === '/projects') {
            const projects = this.services.projectService.getAll();
            return this.sendResponse(res, 200, projects);
        } else if (method === 'POST' && path === '/projects') {
            if (!body || !body.name || !body.description) {
                return this.sendError(res, 400, 'Name and description are required');
            }
            const newProject = this.services.projectService.create(body.name, body.description, body.initialMemberId);
            return this.sendResponse(res, 201, newProject);
        } else if (idMatch) {
            const projectId = idMatch[1];
            if (method === 'GET') {
                const project = this.services.projectService.getById(projectId);
                if (!project) return this.sendError(res, 404, 'Project not found');
                return this.sendResponse(res, 200, project);
            } else if (method === 'PUT') {
                if (!body || (!body.name && !body.description)) {
                    return this.sendError(res, 400, 'Name or description required for update');
                }
                const updatedProject = this.services.projectService.update(projectId, body);
                if (!updatedProject) return this.sendError(res, 404, 'Project not found');
                return this.sendResponse(res, 200, updatedProject);
            } else if (method === 'DELETE') {
                const success = this.services.projectService.delete(projectId);
                if (!success) return this.sendError(res, 404, 'Project not found');
                return this.sendResponse(res, 204, null);
            }
        } else if (memberMatch) {
            const projectId = memberMatch[1];
            if (!body || !body.userId) {
                return this.sendError(res, 400, 'User ID is required');
            }
            // Verify user exists before adding them to a project
            if (!this.services.userService.getById(body.userId)) {
                return this.sendError(res, 404, 'User not found');
            }

            if (method === 'POST') {
                const project = this.services.projectService.addMember(projectId, body.userId);
                if (!project) return this.sendError(res, 404, 'Project not found');
                return this.sendResponse(res, 200, project);
            } else if (method === 'DELETE') {
                const project = this.services.projectService.removeMember(projectId, body.userId);
                if (!project) return this.sendError(res, 404, 'Project not found');
                return this.sendResponse(res, 200, project);
            }
        }
        this.sendError(res, 405, 'Method Not Allowed');
    }

    // --- Task Routes ---
    private async handleTaskRoutes(req: http.IncomingMessage, res: http.ServerResponse, path: string, method: string, body: any, queryParams: URLSearchParams): Promise<void> {
        const idMatch = path.match(/^\/tasks\/([a-f0-9-]+)$/);
        const statusMatch = path.match(/^\/tasks\/([a-f0-9-]+)\/status$/);
        const assignMatch = path.match(/^\/tasks\/([a-f0-9-]+)\/assign$/);

        if (method === 'GET' && path === '/tasks') {
            const projectId = queryParams.get('projectId');
            if (!projectId) {
                return this.sendError(res, 400, 'Project ID is required as a query parameter');
            }
            const tasks = this.services.taskService.getByProject(projectId);
            return this.sendResponse(res, 200, tasks);
        } else if (method === 'POST' && path === '/tasks') {
            if (!body || !body.title || !body.description || !body.projectId) {
                return this.sendError(res, 400, 'Title, description, and projectId are required');
            }
            // Verify project exists
            if (!this.services.projectService.getById(body.projectId)) {
                return this.sendError(res, 404, 'Project not found');
            }
            // Verify assignee if provided
            if (body.assigneeId && !this.services.userService.getById(body.assigneeId)) {
                return this.sendError(res, 404, 'Assignee user not found');
            }
            const newTask = this.services.taskService.create(body.title, body.description, body.projectId, body.assigneeId);
            return this.sendResponse(res, 201, newTask);
        } else if (idMatch) {
            const taskId = idMatch[1];
            if (method === 'GET') {
                const task = this.services.taskService.getById(taskId);
                if (!task) return this.sendError(res, 404, 'Task not found');
                return this.sendResponse(res, 200, task);
            } else if (method === 'PUT') {
                if (!body || (!body.title && !body.description && !body.assigneeId)) {
                    return this.sendError(res, 400, 'Title, description, or assigneeId required for update');
                }
                // Verify assignee if provided
                if (body.assigneeId && !this.services.userService.getById(body.assigneeId)) {
                    return this.sendError(res, 404, 'Assignee user not found');
                }
                const updatedTask = this.services.taskService.update(taskId, body);
                if (!updatedTask) return this.sendError(res, 404, 'Task not found');
                return this.sendResponse(res, 200, updatedTask);
            } else if (method === 'DELETE') {
                const success = this.services.taskService.delete(taskId);
                if (!success) return this.sendError(res, 404, 'Task not found');
                return this.sendResponse(res, 204, null);
            }
        } else if (statusMatch) {
            const taskId = statusMatch[1];
            if (method === 'PUT') {
                if (!body || !body.status) {
                    return this.sendError(res, 400, 'New status is required');
                }
                const newStatus: TaskStatus = body.status;
                if (!['todo', 'in-progress', 'done'].includes(newStatus)) {
                    return this.sendError(res, 400, 'Invalid status. Must be todo, in-progress, or done.');
                }
                const updatedTask = this.services.taskService.changeStatus(taskId, newStatus);
                if (!updatedTask) return this.sendError(res, 400, 'Task not found or invalid status transition');
                return this.sendResponse(res, 200, updatedTask);
            }
        } else if (assignMatch) {
            const taskId = assignMatch[1];
            if (method === 'PUT') {
                if (!body || !body.assigneeId) {
                    return this.sendError(res, 400, 'Assignee ID is required');
                }
                // Verify assignee exists
                if (!this.services.userService.getById(body.assigneeId)) {
                    return this.sendError(res, 404, 'Assignee user not found');
                }
                const updatedTask = this.services.taskService.assign(taskId, body.assigneeId);
                if (!updatedTask) return this.sendError(res, 404, 'Task not found');
                return this.sendResponse(res, 200, updatedTask);
            }
        }
        this.sendError(res, 405, 'Method Not Allowed');
    }

    // --- Comment Routes ---
    private async handleCommentRoutes(req: http.IncomingMessage, res: http.ServerResponse, path: string, method: string, body: any, queryParams: URLSearchParams): Promise<void> {
        const idMatch = path.match(/^\/comments\/([a-f0-9-]+)$/);

        if (method === 'GET' && path === '/comments') {
            const taskId = queryParams.get('taskId');
            if (!taskId) {
                return this.sendError(res, 400, 'Task ID is required as a query parameter');
            }
            const comments = this.services.commentService.getByTask(taskId);
            return this.sendResponse(res, 200, comments);
        } else if (method === 'POST' && path === '/comments') {
            if (!body || !body.taskId || !body.authorId || !body.body) {
                return this.sendError(res, 400, 'Task ID, author ID, and body are required');
            }

            const task = this.services.taskService.getById(body.taskId);
            if (!task) {
                return this.sendError(res, 404, 'Task not found');
            }

            const author = this.services.userService.getById(body.authorId);
            if (!author) {
                return this.sendError(res, 404, 'Author user not found');
            }

            const newComment = this.services.commentService.create(
                body.taskId,
                body.authorId,
                body.body,
                task.title, // taskTitle
                author.name, // authorName
                task.assigneeId // taskAssigneeId
            );
            return this.sendResponse(res, 201, newComment);
        } else if (idMatch) {
            const commentId = idMatch[1];
            if (method === 'GET') {
                const comment = this.services.commentService.getById(commentId);
                if (!comment) return this.sendError(res, 404, 'Comment not found');
                return this.sendResponse(res, 200, comment);
            } else if (method === 'DELETE') {
                const success = this.services.commentService.delete(commentId);
                if (!success) return this.sendError(res, 404, 'Comment not found');
                return this.sendResponse(res, 204, null);
            }
        }
        this.sendError(res, 405, 'Method Not Allowed');
    }

    // --- Notification Routes ---
    private async handleNotificationRoutes(req: http.IncomingMessage, res: http.ServerResponse, path: string, method: string, body: any, queryParams: URLSearchParams): Promise<void> {
        const idReadMatch = path.match(/^\/notifications\/([a-f0-9-]+)\/read$/);

        if (method === 'GET' && path === '/notifications') {
            const userId = queryParams.get('userId');
            if (!userId) {
                return this.sendError(res, 400, 'User ID is required as a query parameter');
            }
            const notifications = this.services.notificationService.getByUser(userId);
            return this.sendResponse(res, 200, notifications);
        } else if (idReadMatch) {
            const notificationId = idReadMatch[1];
            if (method === 'PUT') {
                const updatedNotification = this.services.notificationService.markAsRead(notificationId);
                if (!updatedNotification) return this.sendError(res, 404, 'Notification not found');
                return this.sendResponse(res, 200, updatedNotification);
            }
        }
        this.sendError(res, 405, 'Method Not Allowed');
    }
}
