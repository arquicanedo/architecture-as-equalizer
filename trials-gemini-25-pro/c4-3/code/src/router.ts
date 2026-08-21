import http from 'http';
import { URL } from 'url';
import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';

const parseJSONBody = (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', err => {
            reject(err);
        });
    });
};

const sendResponse = (res: http.ServerResponse, statusCode: number, data: any) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};

const handleError = (res: http.ServerResponse, statusCode: number, message: string) => {
    sendResponse(res, statusCode, { error: message });
};

export const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const method = req.method;
    const path = url.pathname;

    try {
        // User routes
        if (path === '/users' && method === 'GET') {
            const users = userService.getAll();
            sendResponse(res, 200, users);
        } else if (path === '/users' && method === 'POST') {
            const { name, email } = await parseJSONBody(req);
            const user = userService.create(name, email);
            sendResponse(res, 201, user);
        } else if (path.startsWith('/users/') && method === 'GET') {
            const id = path.split('/')[2];
            const user = userService.getById(id);
            if (user) {
                sendResponse(res, 200, user);
            } else {
                handleError(res, 404, 'User not found');
            }
        } else if (path.startsWith('/users/') && method === 'PUT') {
            const id = path.split('/')[2];
            const { name, email } = await parseJSONBody(req);
            const user = userService.update(id, name, email);
            if (user) {
                sendResponse(res, 200, user);
            } else {
                handleError(res, 404, 'User not found');
            }
        } else if (path.startsWith('/users/') && method === 'DELETE') {
            const id = path.split('/')[2];
            const success = userService.delete(id);
            if (success) {
                sendResponse(res, 204, null);
            } else {
                handleError(res, 404, 'User not found');
            }
        } 
        // Project routes
        else if (path === '/projects' && method === 'GET') {
            const projects = projectService.getAll();
            sendResponse(res, 200, projects);
        } else if (path === '/projects' && method === 'POST') {
            const { name, description, ownerId } = await parseJSONBody(req);
            const project = projectService.create(name, description, ownerId);
            sendResponse(res, 201, project);
        } else if (path.startsWith('/projects/') && method === 'GET') {
            const id = path.split('/')[2];
            const project = projectService.getById(id);
            if (project) {
                sendResponse(res, 200, project);
            } else {
                handleError(res, 404, 'Project not found');
            }
        } else if (path.startsWith('/projects/') && method === 'PUT') {
            const id = path.split('/')[2];
            const { name, description } = await parseJSONBody(req);
            const project = projectService.update(id, name, description);
            if (project) {
                sendResponse(res, 200, project);
            } else {
                handleError(res, 404, 'Project not found');
            }
        } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'POST') {
            const id = path.split('/')[2];
            const { memberId } = await parseJSONBody(req);
            const project = projectService.addMember(id, memberId);
            if (project) {
                sendResponse(res, 200, project);
            } else {
                handleError(res, 404, 'Project not found');
            }
        } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'DELETE') {
            const id = path.split('/')[2];
            const { memberId } = await parseJSONBody(req);
            const project = projectService.removeMember(id, memberId);
            if (project) {
                sendResponse(res, 200, project);
            } else {
                handleError(res, 404, 'Project or member not found');
            }
        } 
        // Task routes
        else if (path === '/tasks' && method === 'GET') {
            const projectId = url.searchParams.get('projectId');
            if (projectId) {
                const tasks = taskService.getByProject(projectId);
                sendResponse(res, 200, tasks);
            } else {
                handleError(res, 400, 'Missing projectId query parameter');
            }
        } else if (path === '/tasks' && method === 'POST') {
            const { title, description, projectId } = await parseJSONBody(req);
            const task = taskService.create(title, description, projectId);
            sendResponse(res, 201, task);
        } else if (path.startsWith('/tasks/') && method === 'GET') {
            const id = path.split('/')[2];
            const task = taskService.getById(id);
            if (task) {
                sendResponse(res, 200, task);
            } else {
                handleError(res, 404, 'Task not found');
            }
        } else if (path.startsWith('/tasks/') && method === 'PUT') {
            const id = path.split('/')[2];
            if (path.endsWith('/status')) {
                const { status } = await parseJSONBody(req);
                const task = taskService.changeStatus(id, status);
                if (task) {
                    sendResponse(res, 200, task);
                } else {
                    handleError(res, 400, 'Invalid status transition or task not found');
                }
            } else if (path.endsWith('/assign')) {
                const { assigneeId } = await parseJSONBody(req);
                const task = taskService.assign(id, assigneeId);
                if (task) {
                    sendResponse(res, 200, task);
                } else {
                    handleError(res, 404, 'Task not found');
                }
            } else {
                const { title, description } = await parseJSONBody(req);
                const task = taskService.update(id, title, description);
                if (task) {
                    sendResponse(res, 200, task);
                } else {
                    handleError(res, 404, 'Task not found');
                }
            }
        }
        // Comment routes
        else if (path === '/comments' && method === 'GET') {
            const taskId = url.searchParams.get('taskId');
            if (taskId) {
                const comments = commentService.getByTask(taskId);
                sendResponse(res, 200, comments);
            } else {
                handleError(res, 400, 'Missing taskId query parameter');
            }
        } else if (path === '/comments' && method === 'POST') {
            const { taskId, authorId, body } = await parseJSONBody(req);
            const author = userService.getById(authorId);
            const task = taskService.getById(taskId);
            if (!author || !task) {
                handleError(res, 404, 'Author or task not found');
                return;
            }
            const comment = commentService.create(taskId, authorId, body, task.title, author.name);
            sendResponse(res, 201, comment);
        } 
        // Notification routes
        else if (path === '/notifications' && method === 'GET') {
            const userId = url.searchParams.get('userId');
            if (userId) {
                const notifications = notificationService.getByUser(userId);
                sendResponse(res, 200, notifications);
            } else {
                handleError(res, 400, 'Missing userId query parameter');
            }
        } else if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
            const id = path.split('/')[2];
            const notification = notificationService.markAsRead(id);
            if (notification) {
                sendResponse(res, 200, notification);
            } else {
                handleError(res, 404, 'Notification not found');
            }
        }
        else {
            handleError(res, 404, 'Not Found');
        }
    } catch (error: any) {
        if (error.message === 'Invalid JSON') {
            handleError(res, 400, error.message);
        } else {
            handleError(res, 500, 'Internal Server Error');
        }
    }
});
