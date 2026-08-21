import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';

// Helper to send JSON responses
function sendJson(res: ServerResponse, statusCode: number, data: any) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
}

// Helper to parse JSON request body
function getJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', err => reject(err));
    });
}

// Main request handler
export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const method = req.method;

    // Regex for ID matching in paths
    const idRegex = /\/([0-9a-fA-F-]+)$/; // Matches UUID at the end of the path
    const projectIdMemberRegex = /\/projects\/([0-9a-fA-F-]+)\/members$/;
    const taskIdStatusRegex = /\/tasks\/([0-9a-fA-F-]+)\/status$/;
    const taskIdAssignRegex = /\/tasks\/([0-9a-fA-F-]+)\/assign$/;
    const notifIdReadRegex = /\/notifications\/([0-9a-fA-F-]+)\/read$/;

    try {
        if (method === 'GET') {
            if (path === '/users') {
                sendJson(res, 200, userService.getAll());
            } else if (idRegex.test(path) && path.startsWith('/users/')) {
                const id = idRegex.exec(path)![1];
                const user = userService.getById(id);
                user ? sendJson(res, 200, user) : sendJson(res, 404, { message: 'User not found' });
            } else if (path === '/projects') {
                sendJson(res, 200, projectService.getAll());
            } else if (idRegex.test(path) && path.startsWith('/projects/')) {
                const id = idRegex.exec(path)![1];
                const project = projectService.getById(id);
                project ? sendJson(res, 200, project) : sendJson(res, 404, { message: 'Project not found' });
            } else if (path === '/tasks') {
                const projectId = parsedUrl.searchParams.get('projectId');
                if (!projectId) {
                    return sendJson(res, 400, { message: 'projectId query parameter is required for /tasks GET' });
                }
                const tasks = taskService.getByProject(projectId);
                sendJson(res, 200, tasks);
            } else if (idRegex.test(path) && path.startsWith('/tasks/')) {
                const id = idRegex.exec(path)![1];
                const task = taskService.getById(id);
                task ? sendJson(res, 200, task) : sendJson(res, 404, { message: 'Task not found' });
            } else if (path === '/comments') {
                const taskId = parsedUrl.searchParams.get('taskId');
                if (!taskId) {
                    return sendJson(res, 400, { message: 'taskId query parameter is required for /comments GET' });
                }
                const comments = commentService.getByTask(taskId);
                sendJson(res, 200, comments);
            } else if (idRegex.test(path) && path.startsWith('/comments/')) {
                const id = idRegex.exec(path)![1];
                const comment = commentService.getById(id);
                comment ? sendJson(res, 200, comment) : sendJson(res, 404, { message: 'Comment not found' });
            } else if (path === '/notifications') {
                const userId = parsedUrl.searchParams.get('userId');
                if (!userId) {
                    return sendJson(res, 400, { message: 'userId query parameter is required for /notifications GET' });
                }
                const notifications = notificationService.getByUser(userId);
                sendJson(res, 200, notifications);
            } else {
                sendJson(res, 404, { message: 'Not Found' });
            }
        } else if (method === 'POST') {
            const body = await getJsonBody(req);
            if (path === '/users') {
                const user = userService.create(body.name, body.email);
                sendJson(res, 201, user);
            } else if (path === '/projects') {
                const project = projectService.create(body.name, body.description);
                sendJson(res, 201, project);
            } else if (projectIdMemberRegex.test(path)) {
                const projectId = projectIdMemberRegex.exec(path)![1];
                const project = projectService.addMember(projectId, body.userId);
                project ? sendJson(res, 200, project) : sendJson(res, 404, { message: 'Project not found' });
            } else if (path === '/tasks') {
                const task = taskService.create(body.title, body.description, body.projectId);
                sendJson(res, 201, task);
            } else if (path === '/comments') {
                const comment = commentService.create(body.taskId, body.authorId, body.body);
                sendJson(res, 201, comment);
            } else {
                sendJson(res, 404, { message: 'Not Found' });
            }
        } else if (method === 'PUT') {
            const body = await getJsonBody(req);
            if (idRegex.test(path) && path.startsWith('/users/')) {
                const id = idRegex.exec(path)![1];
                const user = userService.update(id, body);
                user ? sendJson(res, 200, user) : sendJson(res, 404, { message: 'User not found' });
            } else if (idRegex.test(path) && path.startsWith('/projects/')) {
                const id = idRegex.exec(path)![1];
                const project = projectService.update(id, body);
                project ? sendJson(res, 200, project) : sendJson(res, 404, { message: 'Project not found' });
            } else if (idRegex.test(path) && path.startsWith('/tasks/') && !taskIdStatusRegex.test(path) && !taskIdAssignRegex.test(path)) {
                // General task update
                const id = idRegex.exec(path)![1];
                const task = taskService.update(id, body);
                task ? sendJson(res, 200, task) : sendJson(res, 404, { message: 'Task not found' });
            } else if (taskIdStatusRegex.test(path)) {
                const taskId = taskIdStatusRegex.exec(path)![1];
                const task = taskService.changeStatus(taskId, body.status);
                task ? sendJson(res, 200, task) : sendJson(res, 404, { message: 'Task not found or invalid status transition' });
            } else if (taskIdAssignRegex.test(path)) {
                const taskId = taskIdAssignRegex.exec(path)![1];
                const task = taskService.assign(taskId, body.assigneeId);
                task ? sendJson(res, 200, task) : sendJson(res, 404, { message: 'Task not found' });
            } else if (notifIdReadRegex.test(path)) {
                const notifId = notifIdReadRegex.exec(path)![1];
                const notification = notificationService.markAsRead(notifId);
                notification ? sendJson(res, 200, notification) : sendJson(res, 404, { message: 'Notification not found' });
            } else {
                sendJson(res, 404, { message: 'Not Found' });
            }
        } else if (method === 'DELETE') {
            if (idRegex.test(path) && path.startsWith('/users/')) {
                const id = idRegex.exec(path)![1];
                userService.delete(id) ? sendJson(res, 204, null) : sendJson(res, 404, { message: 'User not found' });
            } else if (idRegex.test(path) && path.startsWith('/projects/')) {
                const id = idRegex.exec(path)![1];
                projectService.delete(id) ? sendJson(res, 204, null) : sendJson(res, 404, { message: 'Project not found' });
            } else if (projectIdMemberRegex.test(path)) {
                const projectId = projectIdMemberRegex.exec(path)![1];
                const body = await getJsonBody(req);
                const project = projectService.removeMember(projectId, body.userId);
                project ? sendJson(res, 200, project) : sendJson(res, 404, { message: 'Project not found' });
            } else if (idRegex.test(path) && path.startsWith('/tasks/')) {
                const id = idRegex.exec(path)![1];
                taskService.delete(id) ? sendJson(res, 204, null) : sendJson(res, 404, { message: 'Task not found' });
            } else if (idRegex.test(path) && path.startsWith('/comments/')) {
                const id = idRegex.exec(path)![1];
                commentService.delete(id) ? sendJson(res, 204, null) : sendJson(res, 404, { message: 'Comment not found' });
            } else {
                sendJson(res, 404, { message: 'Not Found' });
            }
        } else {
            sendJson(res, 405, { message: 'Method Not Allowed' });
        }
    } catch (error: any) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('Invalid JSON') || error.message.includes('required')) {
                sendJson(res, 400, { message: error.message });
            } else if (error.message.includes('already exists') || error.message.includes('invalid status')) {
                // Using 409 Conflict for business logic errors like invalid state transitions or duplicate emails
                sendJson(res, 409, { message: error.message });
            } else {
                sendJson(res, 500, { message: 'Internal Server Error', error: error.message });
                console.error('Error handling request:', error);
            }
        } else {
            sendJson(res, 500, { message: 'Internal Server Error', error: 'An unknown error occurred.' });
            console.error('Unknown error handling request:', error);
        }
    }
}
