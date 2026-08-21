import * as http from 'http';
import { URL } from 'url';

import { eventBus } from './event-bus';

import { UserService, CreateUserInput, UpdateUserInput, User } from './services/user-service';
import { ProjectService, CreateProjectInput, UpdateProjectInput, Project } from './services/project-service';
import { TaskService, CreateTaskInput, UpdateTaskInput, TaskStatus, Task } from './services/task-service';
import { CommentService, CreateCommentInput, Comment } from './services/comment-service';
import { NotificationService, Notification } from './services/notification-service';

interface RouteHandler {
    (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, body: any): Promise<void>;
}

interface Routes {
    [method: string]: { // GET, POST, PUT, DELETE
        [path: string]: RouteHandler; // /users, /users/:id
    };
}

export class ApiRouter {
    private userService: UserService;
    private projectService: ProjectService;
    private taskService: TaskService;
    private commentService: CommentService;
    private notificationService: NotificationService;

    private routes: Routes = {
        'GET': {},
        'POST': {},
        'PUT': {},
        'DELETE': {},
    };

    constructor() {
        this.userService = new UserService();
        this.projectService = new ProjectService();
        this.taskService = new TaskService();
        this.commentService = new CommentService();
        this.notificationService = new NotificationService();
    }

    public getRequestListener(): http.RequestListener {
        return async (req, res) => {
            res.setHeader('Content-Type', 'application/json');

            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            const method = req.method as keyof Routes;
            const path = url.pathname;
            const queryParams = Object.fromEntries(url.searchParams.entries());

            let body: any = {};
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                try {
                    body = await this.parseRequestBody(req);
                } catch (error) {
                    return this.sendError(res, 400, 'Invalid JSON body');
                }
            }

            let handler: RouteHandler | undefined;
            let pathParams: Record<string, string> = {};

            // Find matching route
            for (const routePath in this.routes[method]) {
                const match = this.matchPath(routePath, path);
                if (match) {
                    handler = this.routes[method][routePath];
                    pathParams = match;
                    break;
                }
            }

            if (handler) {
                try {
                    await handler(req, res, { ...pathParams, ...queryParams }, body);
                } catch (error: any) {
                    console.error('Handler error:', error);
                    this.sendError(res, 500, error.message || 'Internal Server Error');
                }
            } else {
                this.sendError(res, 404, 'Not Found');
            }
        };
    }

    private matchPath(routePath: string, actualPath: string): Record<string, string> | null {
        const routeParts = routePath.split('/').filter(Boolean);
        const actualParts = actualPath.split('/').filter(Boolean);

        if (routeParts.length !== actualParts.length) {
            return null;
        }

        const params: Record<string, string> = {};
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const actualPart = actualParts[i];

            if (routePart.startsWith(':')) {
                params[routePart.substring(1)] = actualPart;
            } else if (routePart !== actualPart) {
                return null;
            }
        }
        return params;
    }

    private parseRequestBody(req: http.IncomingMessage): Promise<any> {
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

    private sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
        res.writeHead(statusCode);
        res.end(JSON.stringify(data));
    }

    private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
        this.sendResponse(res, statusCode, { error: message });
    }

    private registerRoute(method: string, path: string, handler: RouteHandler): void {
        this.routes[method][path] = handler;
    }

    // User Routes
    private setupUserRoutes(): void {
        this.registerRoute('GET', '/users', async (req, res, params) => {
            const users = this.userService.listUsers();
            this.sendResponse(res, 200, users);
        });

        this.registerRoute('POST', '/users', async (req, res, params, body: CreateUserInput) => {
            if (!body.name || !body.email) {
                return this.sendError(res, 400, 'Name and email are required');
            }
            const newUser = this.userService.createUser(body);
            this.sendResponse(res, 201, newUser);
        });

        this.registerRoute('GET', '/users/:id', async (req, res, params) => {
            const user = this.userService.getUser(params.id);
            if (user) {
                this.sendResponse(res, 200, user);
            } else {
                this.sendError(res, 404, 'User not found');
            }
        });

        this.registerRoute('PUT', '/users/:id', async (req, res, params, body: UpdateUserInput) => {
            const updatedUser = this.userService.updateUser(params.id, body);
            if (updatedUser) {
                this.sendResponse(res, 200, updatedUser);
            } else {
                this.sendError(res, 404, 'User not found');
            }
        });

        this.registerRoute('DELETE', '/users/:id', async (req, res, params) => {
            const deleted = this.userService.deleteUser(params.id);
            if (deleted) {
                this.sendResponse(res, 204, null);
            } else {
                this.sendError(res, 404, 'User not found');
            }
        });
    }

    // Project Routes
    private setupProjectRoutes(): void {
        this.registerRoute('GET', '/projects', async (req, res, params) => {
            const projects = this.projectService.listProjects();
            this.sendResponse(res, 200, projects);
        });

        this.registerRoute('POST', '/projects', async (req, res, params, body: CreateProjectInput) => {
            if (!body.name || !body.description) {
                return this.sendError(res, 400, 'Name and description are required');
            }
            const newProject = this.projectService.createProject(body);
            this.sendResponse(res, 201, newProject);
        });

        this.registerRoute('GET', '/projects/:id', async (req, res, params) => {
            const project = this.projectService.getProject(params.id);
            if (project) {
                this.sendResponse(res, 200, project);
            } else {
                this.sendError(res, 404, 'Project not found');
            }
        });

        this.registerRoute('PUT', '/projects/:id', async (req, res, params, body: UpdateProjectInput) => {
            const updatedProject = this.projectService.updateProject(params.id, body);
            if (updatedProject) {
                this.sendResponse(res, 200, updatedProject);
            } else {
                this.sendError(res, 404, 'Project not found');
            }
        });

        this.registerRoute('DELETE', '/projects/:id', async (req, res, params) => {
            const deleted = this.projectService.deleteProject(params.id);
            if (deleted) {
                this.sendResponse(res, 204, null);
            } else {
                this.sendError(res, 404, 'Project not found');
            }
        });

        this.registerRoute('POST', '/projects/:id/members', async (req, res, params, body: { userId: string }) => {
            if (!body.userId) {
                return this.sendError(res, 400, 'User ID is required');
            }
            const updatedProject = this.projectService.addMember(params.id, body.userId);
            if (updatedProject) {
                this.sendResponse(res, 200, updatedProject);
            } else {
                this.sendError(res, 404, 'Project not found or user not found');
            }
        });

        this.registerRoute('DELETE', '/projects/:id/members', async (req, res, params, body: { userId: string }) => {
            if (!body.userId) {
                return this.sendError(res, 400, 'User ID is required');
            }
            const updatedProject = this.projectService.removeMember(params.id, body.userId);
            if (updatedProject) {
                this.sendResponse(res, 200, updatedProject);
            } else {
                this.sendError(res, 404, 'Project not found');
            }
        });
    }

    // Task Routes
    private setupTaskRoutes(): void {
        this.registerRoute('GET', '/tasks', async (req, res, params) => {
            const projectId = params.projectId;
            if (!projectId) {
                return this.sendError(res, 400, 'projectId query parameter is required');
            }
            const tasks = this.taskService.listTasks(projectId);
            this.sendResponse(res, 200, tasks);
        });

        this.registerRoute('POST', '/tasks', async (req, res, params, body: CreateTaskInput) => {
            if (!body.title || !body.description || !body.projectId) {
                return this.sendError(res, 400, 'Title, description, and projectId are required');
            }
            const newTask = this.taskService.createTask(body);
            this.sendResponse(res, 201, newTask);
        });

        this.registerRoute('GET', '/tasks/:id', async (req, res, params) => {
            const task = this.taskService.getTask(params.id);
            if (task) {
                this.sendResponse(res, 200, task);
            }
            else {
                this.sendError(res, 404, 'Task not found');
            }
        });

        this.registerRoute('PUT', '/tasks/:id', async (req, res, params, body: UpdateTaskInput) => {
            const updatedTask = this.taskService.updateTask(params.id, body);
            if (updatedTask) {
                this.sendResponse(res, 200, updatedTask);
            } else {
                this.sendError(res, 404, 'Task not found');
            }
        });

        this.registerRoute('DELETE', '/tasks/:id', async (req, res, params) => {
            const deleted = this.taskService.deleteTask(params.id);
            if (deleted) {
                this.sendResponse(res, 204, null);
            } else {
                this.sendError(res, 404, 'Task not found');
            }
        });

        this.registerRoute('PUT', '/tasks/:id/status', async (req, res, params, body: { status: TaskStatus }) => {
            if (!body.status) {
                return this.sendError(res, 400, 'Status is required');
            }
            if (!['todo', 'in-progress', 'done'].includes(body.status)) {
                return this.sendError(res, 400, 'Invalid status. Must be todo, in-progress, or done.');
            }
            const updatedTask = this.taskService.changeStatus(params.id, body.status);
            if (updatedTask) {
                this.sendResponse(res, 200, updatedTask);
            } else {
                this.sendError(res, 400, 'Invalid status transition or Task not found');
            }
        });

        this.registerRoute('PUT', '/tasks/:id/assign', async (req, res, params, body: { assigneeId: string }) => {
            if (!body.assigneeId) {
                return this.sendError(res, 400, 'Assignee ID is required');
            }
            const updatedTask = this.taskService.assignTask(params.id, body.assigneeId);
            if (updatedTask) {
                this.sendResponse(res, 200, updatedTask);
            } else {
                this.sendError(res, 404, 'Task not found');
            }
        });
    }

    // Comment Routes
    private setupCommentRoutes(): void {
        this.registerRoute('GET', '/comments', async (req, res, params) => {
            const taskId = params.taskId;
            if (!taskId) {
                return this.sendError(res, 400, 'taskId query parameter is required');
            }
            const comments = this.commentService.listComments(taskId);
            this.sendResponse(res, 200, comments);
        });

        this.registerRoute('POST', '/comments', async (req, res, params, body: Omit<CreateCommentInput, 'authorName' | 'taskTitle'> & { authorId: string, taskId: string, body: string }) => {
            if (!body.taskId || !body.authorId || !body.body) {
                return this.sendError(res, 400, 'taskId, authorId, and body are required');
            }

            // Enrich comment data for event publishing
            const author = this.userService.getUser(body.authorId);
            const task = this.taskService.getTask(body.taskId);

            if (!author) {
                return this.sendError(res, 404, 'Author not found');
            }
            if (!task) {
                return this.sendError(res, 404, 'Task not found');
            }

            const enrichedBody: CreateCommentInput = {
                ...body,
                authorName: author.name,
                taskTitle: task.title,
            };

            const newComment = this.commentService.createComment(enrichedBody);
            this.sendResponse(res, 201, newComment);
        });

        this.registerRoute('GET', '/comments/:id', async (req, res, params) => {
            const comment = this.commentService.getComment(params.id);
            if (comment) {
                this.sendResponse(res, 200, comment);
            }
            else {
                this.sendError(res, 404, 'Comment not found');
            }
        });

        this.registerRoute('DELETE', '/comments/:id', async (req, res, params) => {
            const deleted = this.commentService.deleteComment(params.id);
            if (deleted) {
                this.sendResponse(res, 204, null);
            } else {
                this.sendError(res, 404, 'Comment not found');
            }
        });
    }

    // Notification Routes
    private setupNotificationRoutes(): void {
        this.registerRoute('GET', '/notifications', async (req, res, params) => {
            const userId = params.userId;
            if (!userId) {
                return this.sendError(res, 400, 'userId query parameter is required');
            }
            const notifications = this.notificationService.listNotifications(userId);
            this.sendResponse(res, 200, notifications);
        });

        this.registerRoute('PUT', '/notifications/:id/read', async (req, res, params) => {
            const updatedNotification = this.notificationService.markNotificationAsRead(params.id);
            if (updatedNotification) {
                this.sendResponse(res, 200, updatedNotification);
            } else {
                this.sendError(res, 404, 'Notification not found');
            }
        });
    }

    public init(): void {
        this.setupUserRoutes();
        this.setupProjectRoutes();
        this.setupTaskRoutes();
        this.setupCommentRoutes();
        this.setupNotificationRoutes();
    }
}
