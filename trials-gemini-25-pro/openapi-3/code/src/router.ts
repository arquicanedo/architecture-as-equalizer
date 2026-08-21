import http from 'http';
import { URL } from 'url';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

// Helper to parse body
function parseJSONBody(req: http.IncomingMessage): Promise<any> {
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
    });
}

// Helper to send response
function sendResponse(res: http.ServerResponse, statusCode: number, data: any) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string) {
    sendResponse(res, statusCode, { error: message });
}

function sendNotFound(res: http.ServerResponse) {
    sendError(res, 404, 'Not Found');
}

export function createRouter(
    userService: UserService,
    projectService: ProjectService,
    taskService: TaskService,
    commentService: CommentService,
    notificationService: NotificationService
) {
    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const method = req.method;
        const path = url.pathname;

        try {
            // User routes
            if (path === '/users' && method === 'GET') {
                const users = userService.findAll();
                sendResponse(res, 200, users);
            } else if (path === '/users' && method === 'POST') {
                const body = await parseJSONBody(req);
                const user = userService.create(body);
                sendResponse(res, 201, user);
            } else if (path.startsWith('/users/') && method === 'GET') {
                const id = path.split('/')[2];
                const user = userService.findById(id);
                user ? sendResponse(res, 200, user) : sendNotFound(res);
            } else if (path.startsWith('/users/') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const user = userService.update(id, body);
                user ? sendResponse(res, 200, user) : sendNotFound(res);
            } else if (path.startsWith('/users/') && method === 'DELETE') {
                const id = path.split('/')[2];
                userService.delete(id) ? res.writeHead(204).end() : sendNotFound(res);
            } 

            // Project routes
            else if (path === '/projects' && method === 'GET') {
                const projects = projectService.findAll();
                sendResponse(res, 200, projects);
            } else if (path === '/projects' && method === 'POST') {
                const body = await parseJSONBody(req);
                const project = projectService.create(body);
                sendResponse(res, 201, project);
            } else if (path.startsWith('/projects/') && method === 'GET') {
                const id = path.split('/')[2];
                if (id) {
                    const project = projectService.findById(id);
                    project ? sendResponse(res, 200, project) : sendNotFound(res);
                }
            } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'POST') {
                const id = path.split('/')[2];
                const { userId } = await parseJSONBody(req);
                if (!userId) return sendError(res, 400, 'userId is required');
                // Check if user exists
                if (!userService.findById(userId)) return sendError(res, 404, 'User not found');
                const project = projectService.addMember(id, userId);
                project ? sendResponse(res, 200, project) : sendNotFound(res);
            } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'DELETE') {
                const id = path.split('/')[2];
                const { userId } = await parseJSONBody(req);
                if (!userId) return sendError(res, 400, 'userId is required');
                const project = projectService.removeMember(id, userId);
                project ? sendResponse(res, 200, project) : sendNotFound(res);
            } else if (path.startsWith('/projects/') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const project = projectService.update(id, body);
                project ? sendResponse(res, 200, project) : sendNotFound(res);
            } else if (path.startsWith('/projects/') && method === 'DELETE') {
                const id = path.split('/')[2];
                projectService.delete(id) ? res.writeHead(204).end() : sendNotFound(res);
            }

            // Task routes
            else if (path === '/tasks' && method === 'GET') {
                const projectId = url.searchParams.get('projectId');
                if (!projectId) return sendError(res, 400, 'projectId is required');
                const tasks = taskService.findByProjectId(projectId);
                sendResponse(res, 200, tasks);
            } else if (path === '/tasks' && method === 'POST') {
                const body = await parseJSONBody(req);
                if (!projectService.findById(body.projectId)) return sendError(res, 404, 'Project not found');
                const task = taskService.create(body);
                sendResponse(res, 201, task);
            } else if (path.startsWith('/tasks/') && path.endsWith('/status') && method === 'PUT') {
                 const id = path.split('/')[2];
                 const { status } = await parseJSONBody(req);
                 if (!status) return sendError(res, 400, 'status is required');
                 try {
                    const task = taskService.changeStatus(id, status);
                    task ? sendResponse(res, 200, task) : sendNotFound(res);
                 } catch (e: any) {
                    sendError(res, 400, e.message);
                 }
            } else if (path.startsWith('/tasks/') && path.endsWith('/assign') && method === 'PUT') {
                const id = path.split('/')[2];
                const { assigneeId } = await parseJSONBody(req);
                if (!assigneeId) return sendError(res, 400, 'assigneeId is required');
                if (!userService.findById(assigneeId)) return sendError(res, 404, 'Assignee (user) not found');
                const task = taskService.assign(id, assigneeId);
                task ? sendResponse(res, 200, task) : sendNotFound(res);
            } else if (path.startsWith('/tasks/') && method === 'GET') {
                const id = path.split('/')[2];
                const task = taskService.findById(id);
                task ? sendResponse(res, 200, task) : sendNotFound(res);
            } else if (path.startsWith('/tasks/') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const task = taskService.update(id, body);
                task ? sendResponse(res, 200, task) : sendNotFound(res);
            } else if (path.startsWith('/tasks/') && method === 'DELETE') {
                const id = path.split('/')[2];
                taskService.delete(id) ? res.writeHead(204).end() : sendNotFound(res);
            }

            // Comment routes
            else if (path === '/comments' && method === 'GET') {
                const taskId = url.searchParams.get('taskId');
                if (!taskId) return sendError(res, 400, 'taskId is required');
                const comments = commentService.findByTaskId(taskId);
                sendResponse(res, 200, comments);
            } else if (path === '/comments' && method === 'POST') {
                const body = await parseJSONBody(req);
                const task = taskService.findById(body.taskId);
                const author = userService.findById(body.authorId);
                if (!task) return sendError(res, 404, 'Task not found');
                if (!author) return sendError(res, 404, 'Author (user) not found');
                
                const comment = commentService.create(body, { taskTitle: task.title, authorName: author.name });
                sendResponse(res, 201, comment);

            } else if (path.startsWith('/comments/') && method === 'GET') {
                const id = path.split('/')[2];
                const comment = commentService.findById(id);
                comment ? sendResponse(res, 200, comment) : sendNotFound(res);
            } else if (path.startsWith('/comments/') && method === 'DELETE') {
                const id = path.split('/')[2];
                commentService.delete(id) ? res.writeHead(204).end() : sendNotFound(res);
            }
            
            // Notification routes
            else if (path === '/notifications' && method === 'GET') {
                const userId = url.searchParams.get('userId');
                if (!userId) return sendError(res, 400, 'userId is required');
                const notifications = notificationService.findByUserId(userId);
                sendResponse(res, 200, notifications);
            } else if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
                const id = path.split('/')[2];
                const notification = notificationService.markAsRead(id);
                notification ? sendResponse(res, 200, notification) : sendNotFound(res);
            }

            // No match
            else {
                sendNotFound(res);
            }
        } catch (e) {
            console.error('Internal Server Error:', e);
            sendError(res, 500, 'Internal Server Error');
        }
    };
}
