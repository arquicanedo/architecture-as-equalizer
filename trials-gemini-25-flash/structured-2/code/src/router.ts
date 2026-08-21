import * as http from 'http';
import { URL } from 'url';

import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

// Custom error for HTTP responses
class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

// Helper to send JSON responses
function sendJsonResponse(res: http.ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Helper to read JSON request body
async function readJsonBody(req: http.IncomingMessage): Promise<any> {
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
                    reject(new HttpError(400, 'Invalid JSON body'));
                }
            } else {
                resolve({}); // No body, return empty object
            }
        });
        req.on('error', err => reject(new HttpError(500, 'Error reading request body')));
    });
}

// The Router class
export class ApiRouter {
    private userService: UserService;
    private projectService: ProjectService;
    private taskService: TaskService;
    private commentService: CommentService;
    private notificationService: NotificationService;

    constructor(
        userService: UserService,
        projectService: ProjectService,
        taskService: TaskService,
        commentService: CommentService,
        notificationService: NotificationService
    ) {
        this.userService = userService;
        this.projectService = projectService;
        this.taskService = taskService;
        this.commentService = commentService;
        this.notificationService = notificationService;
    }

    // This method will be the actual HTTP request listener
    async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const { method, url } = req;
        const parsedUrl = new URL(url || '/', `http://${req.headers.host}`);
        const path = parsedUrl.pathname;
        const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

        console.log(`Received ${method} request for ${path} with query ${JSON.stringify(queryParams)} and host ${req.headers.host}`);

        try {
            let body: any = {};
            if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
                body = await readJsonBody(req);
            }

            const pathSegments = path.split('/').filter(Boolean); // e.g., ['users', '123']

            // Helper to extract ID from path segments
            const getIdFromPath = (segments: string[], index: number): string | undefined => {
                if (segments.length > index && segments[index]) {
                    return segments[index];
                }
                return undefined;
            };

            // --- Users --- START
            if (pathSegments[0] === 'users') {
                const userId = getIdFromPath(pathSegments, 1);
                if (method === 'GET' && !userId && pathSegments.length === 1) { // GET /users
                    const users = this.userService.getAll();
                    return sendJsonResponse(res, 200, users);
                } else if (method === 'POST' && !userId && pathSegments.length === 1) { // POST /users
                    if (!body.name || !body.email) throw new HttpError(400, 'Name and email are required');
                    const user = this.userService.create(body.name, body.email);
                    return sendJsonResponse(res, 201, user);
                } else if (method === 'GET' && userId && pathSegments.length === 2) { // GET /users/:id
                    const user = this.userService.getById(userId);
                    if (!user) throw new HttpError(404, 'User not found');
                    return sendJsonResponse(res, 200, user);
                } else if (method === 'PUT' && userId && pathSegments.length === 2) { // PUT /users/:id
                    const user = this.userService.update(userId, body.name, body.email);
                    if (!user) throw new HttpError(404, 'User not found');
                    return sendJsonResponse(res, 200, user);
                } else if (method === 'DELETE' && userId && pathSegments.length === 2) { // DELETE /users/:id
                    const deleted = this.userService.delete(userId);
                    if (!deleted) throw new HttpError(404, 'User not found');
                    return sendJsonResponse(res, 204, null);
                }
            }
            // --- Users --- END

            // --- Projects --- START
            else if (pathSegments[0] === 'projects') {
                const projectId = getIdFromPath(pathSegments, 1);
                const subPath = getIdFromPath(pathSegments, 2); // 'members'

                if (method === 'GET' && !projectId && pathSegments.length === 1) { // GET /projects
                    const projects = this.projectService.getAll();
                    return sendJsonResponse(res, 200, projects);
                } else if (method === 'POST' && !projectId && pathSegments.length === 1) { // POST /projects
                    if (!body.name || !body.description) throw new HttpError(400, 'Name and description are required');
                    const project = this.projectService.create(body.name, body.description);
                    return sendJsonResponse(res, 201, project);
                } else if (method === 'GET' && projectId && !subPath && pathSegments.length === 2) { // GET /projects/:id
                    const project = this.projectService.getById(projectId);
                    if (!project) throw new HttpError(404, 'Project not found');
                    return sendJsonResponse(res, 200, project);
                } else if (method === 'PUT' && projectId && !subPath && pathSegments.length === 2) { // PUT /projects/:id
                    const project = this.projectService.update(projectId, body.name, body.description);
                    if (!project) throw new HttpError(404, 'Project not found');
                    return sendJsonResponse(res, 200, project);
                } else if (method === 'DELETE' && projectId && !subPath && pathSegments.length === 2) { // DELETE /projects/:id
                    const deleted = this.projectService.delete(projectId);
                    if (!deleted) throw new HttpError(404, 'Project not found');
                    return sendJsonResponse(res, 204, null);
                } else if (method === 'POST' && projectId && subPath === 'members' && pathSegments.length === 3) { // POST /projects/:id/members
                    if (!body.userId) throw new HttpError(400, 'userId is required');
                    const project = this.projectService.addMember(projectId, body.userId);
                    if (!project) throw new HttpError(404, 'Project not found or user already a member');
                    return sendJsonResponse(res, 200, project);
                } else if (method === 'DELETE' && projectId && subPath === 'members' && pathSegments.length === 3) { // DELETE /projects/:id/members
                    if (!body.userId) throw new HttpError(400, 'userId is required');
                    const project = this.projectService.removeMember(projectId, body.userId);
                    if (!project) throw new HttpError(404, 'Project not found or user not a member');
                    return sendJsonResponse(res, 200, project);
                }
            }
            // --- Projects --- END

            // --- Tasks --- START
            else if (pathSegments[0] === 'tasks') {
                const taskId = getIdFromPath(pathSegments, 1);
                const subPath = getIdFromPath(pathSegments, 2); // 'status' or 'assign'

                if (method === 'GET' && !taskId && pathSegments.length === 1) { // GET /tasks?projectId=X
                    const projectId = queryParams.projectId;
                    if (!projectId) throw new HttpError(400, 'projectId query parameter is required');
                    const tasks = this.taskService.getByProject(projectId);
                    return sendJsonResponse(res, 200, tasks);
                } else if (method === 'POST' && !taskId && pathSegments.length === 1) { // POST /tasks
                    if (!body.title || !body.description || !body.projectId) throw new HttpError(400, 'Title, description, and projectId are required');
                    const project = this.projectService.getById(body.projectId); // Check project exists
                    if (!project) throw new HttpError(404, `Project with ID ${body.projectId} not found`);
                    const task = this.taskService.create(body.title, body.description, body.projectId);
                    return sendJsonResponse(res, 201, task);
                } else if (method === 'GET' && taskId && !subPath && pathSegments.length === 2) { // GET /tasks/:id
                    const task = this.taskService.getById(taskId);
                    if (!task) throw new HttpError(404, 'Task not found');
                    return sendJsonResponse(res, 200, task);
                } else if (method === 'PUT' && taskId && !subPath && pathSegments.length === 2) { // PUT /tasks/:id
                    const task = this.taskService.update(taskId, body.title, body.description);
                    if (!task) throw new HttpError(404, 'Task not found');
                    return sendJsonResponse(res, 200, task);
                } else if (method === 'DELETE' && taskId && !subPath && pathSegments.length === 2) { // DELETE /tasks/:id
                    const deleted = this.taskService.delete(taskId);
                    if (!deleted) throw new HttpError(404, 'Task not found');
                    return sendJsonResponse(res, 204, null);
                } else if (method === 'PUT' && taskId && subPath === 'status' && pathSegments.length === 3) { // PUT /tasks/:id/status
                    if (!body.newStatus || !['todo', 'in-progress', 'done'].includes(body.newStatus)) throw new HttpError(400, 'Invalid newStatus');
                    const task = this.taskService.changeStatus(taskId, body.newStatus as TaskStatus);
                    if (!task) throw new HttpError(400, 'Task not found or invalid status transition');
                    return sendJsonResponse(res, 200, task);
                } else if (method === 'PUT' && taskId && subPath === 'assign' && pathSegments.length === 3) { // PUT /tasks/:id/assign
                    if (!body.assigneeId) throw new HttpError(400, 'assigneeId is required');
                    const assignee = this.userService.getById(body.assigneeId); // Check assignee exists
                    if (!assignee) throw new HttpError(404, `Assignee with ID ${body.assigneeId} not found`);

                    const task = this.taskService.assign(taskId, body.assigneeId);
                    if (!task) throw new HttpError(404, 'Task not found');
                    return sendJsonResponse(res, 200, task);
                }
            }
            // --- Tasks --- END

            // --- Comments --- START
            else if (pathSegments[0] === 'comments') {
                const commentId = getIdFromPath(pathSegments, 1);

                if (method === 'GET' && !commentId && pathSegments.length === 1) { // GET /comments?taskId=X
                    const taskId = queryParams.taskId;
                    if (!taskId) throw new HttpError(400, 'taskId query parameter is required');
                    const comments = this.commentService.getByTask(taskId);
                    return sendJsonResponse(res, 200, comments);
                } else if (method === 'POST' && !commentId && pathSegments.length === 1) { // POST /comments
                    if (!body.taskId || !body.authorId || !body.body) throw new HttpError(400, 'taskId, authorId, and body are required');

                    // Orchestration: Get task and author info for event bus payload
                    const task = this.taskService.getById(body.taskId);
                    if (!task) throw new HttpError(404, `Task with ID ${body.taskId} not found`);

                    const author = this.userService.getById(body.authorId);
                    if (!author) throw new HttpError(404, `Author with ID ${body.authorId} not found`);

                    const comment = this.commentService.create(
                        body.taskId,
                        body.authorId,
                        body.body,
                        task.title, // taskTitle for event
                        author.name, // authorName for event
                        task.assigneeId // taskAssigneeId for event
                    );
                    return sendJsonResponse(res, 201, comment);
                } else if (method === 'GET' && commentId && pathSegments.length === 2) { // GET /comments/:id
                    const comment = this.commentService.getById(commentId);
                    if (!comment) throw new HttpError(404, 'Comment not found');
                    return sendJsonResponse(res, 200, comment);
                } else if (method === 'DELETE' && commentId && pathSegments.length === 2) { // DELETE /comments/:id
                    const deleted = this.commentService.delete(commentId);
                    if (!deleted) throw new HttpError(404, 'Comment not found');
                    return sendJsonResponse(res, 204, null);
                }
            }
            // --- Comments --- END

            // --- Notifications --- START
            else if (pathSegments[0] === 'notifications') {
                const notificationId = getIdFromPath(pathSegments, 1);
                const subPath = getIdFromPath(pathSegments, 2); // 'read'

                if (method === 'GET' && !notificationId && pathSegments.length === 1) { // GET /notifications?userId=X
                    const userId = queryParams.userId;
                    if (!userId) throw new HttpError(400, 'userId query parameter is required');
                    // Check if user exists (optional, but good practice)
                    const user = this.userService.getById(userId);
                    if (!user) throw new HttpError(404, `User with ID ${userId} not found`);

                    const notifications = this.notificationService.getByUser(userId);
                    return sendJsonResponse(res, 200, notifications);
                } else if (method === 'PUT' && notificationId && subPath === 'read' && pathSegments.length === 3) { // PUT /notifications/:id/read
                    const notification = this.notificationService.markAsRead(notificationId);
                    if (!notification) throw new HttpError(404, 'Notification not found');
                    return sendJsonResponse(res, 200, notification);
                }
            }
            // --- Notifications --- END

            // --- Fallback for unknown routes --- 
            sendJsonResponse(res, 404, { message: 'Not Found' });

        } catch (error: any) {
            if (error instanceof HttpError) {
                sendJsonResponse(res, error.statusCode, { message: error.message });
            } else {
                console.error('Unhandled server error:', error);
                sendJsonResponse(res, 500, { message: 'Internal Server Error' });
            }
        }
    }
}
