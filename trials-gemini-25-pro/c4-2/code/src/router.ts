import * as http from 'http';
import { URL } from 'url';

import { userService } from './services/user-service';
import { projectService } from './services/project-service';
import { taskService } from './services/task-service';
import { commentService } from './services/comment-service';
import { notificationService } from './services/notification-service';

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse, id?: string) => void;

const parseBody = (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => body += chunk.toString());
        req.on('error', reject);
        req.on('end', () => {
            if (body) {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Invalid JSON'));
                }
            } else {
                resolve({});
            }
        });
    });
};

const routes: { [key: string]: { [key: string]: RouteHandler } } = {
    '/users': {
        'GET': (req, res) => {
            const users = userService.getAll();
            res.end(JSON.stringify(users));
        },
        'POST': async (req, res) => {
            const body = await parseBody(req);
            const user = userService.create(body);
            res.statusCode = 201;
            res.end(JSON.stringify(user));
        }
    },
    '/users/:id': {
        'GET': (req, res, id) => {
            const user = userService.getById(id!);
            if (user) {
                res.end(JSON.stringify(user));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'User not found' }));
            }
        },
        'PUT': async (req, res, id) => {
            const body = await parseBody(req);
            const user = userService.update(id!, body);
            if (user) {
                res.end(JSON.stringify(user));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'User not found' }));
            }
        },
        'DELETE': (req, res, id) => {
            const success = userService.delete(id!);
            if (success) {
                res.statusCode = 204;
                res.end();
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'User not found' }));
            }
        }
    },
    '/projects': {
        'GET': (req, res) => {
            const projects = projectService.getAll();
            res.end(JSON.stringify(projects));
        },
        'POST': async (req, res) => {
            const body = await parseBody(req);
            const project = projectService.create(body);
            res.statusCode = 201;
            res.end(JSON.stringify(project));
        }
    },
    '/projects/:id': {
        'GET': (req, res, id) => {
            const project = projectService.getById(id!);
            if (project) {
                res.end(JSON.stringify(project));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Project not found' }));
            }
        },
        'PUT': async (req, res, id) => {
            const body = await parseBody(req);
            const project = projectService.update(id!, body);
            if (project) {
                res.end(JSON.stringify(project));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Project not found' }));
            }
        },
        'DELETE': (req, res, id) => {
            const success = projectService.delete(id!);
            if (success) {
                res.statusCode = 204;
                res.end();
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Project not found' }));
            }
        }
    },
    '/projects/:id/members': {
        'POST': async (req, res, id) => {
            const body = await parseBody(req);
            const project = projectService.addMember(id!, body.userId);
            if (project) {
                res.end(JSON.stringify(project));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Project not found' }));
            }
        },
        'DELETE': async (req, res, id) => {
            const body = await parseBody(req);
            const project = projectService.removeMember(id!, body.userId);
             if (project) {
                res.end(JSON.stringify(project));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Project not found' }));
            }
        }
    },
    '/tasks': {
        'GET': (req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const projectId = url.searchParams.get('projectId');
            if (projectId) {
                const tasks = taskService.getByProject(projectId);
                res.end(JSON.stringify(tasks));
            } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: 'Missing projectId query parameter' }));
            }
        },
        'POST': async (req, res) => {
            const body = await parseBody(req);
            const task = taskService.create(body);
            res.statusCode = 201;
            res.end(JSON.stringify(task));
        }
    },
     '/tasks/:id': {
        'GET': (req, res, id) => {
            const task = taskService.getById(id!);
            if (task) {
                res.end(JSON.stringify(task));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Task not found' }));
            }
        },
        'PUT': async (req, res, id) => {
            const body = await parseBody(req);
            const task = taskService.update(id!, body);
            if (task) {
                res.end(JSON.stringify(task));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Task not found' }));
            }
        },
        'DELETE': (req, res, id) => {
            const success = taskService.delete(id!);
            if (success) {
                res.statusCode = 204;
                res.end();
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Task not found' }));
            }
        }
    },
    '/tasks/:id/status': {
        'PUT': async (req, res, id) => {
            const { status } = await parseBody(req);
            const task = taskService.changeStatus(id!, status);
            if (task) {
                res.end(JSON.stringify(task));
            } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: 'Invalid status transition or task not found' }));
            }
        }
    },
    '/tasks/:id/assign': {
        'PUT': async (req, res, id) => {
            const { assigneeId } = await parseBody(req);
            const task = taskService.assign(id!, assigneeId);
            if (task) {
                res.end(JSON.stringify(task));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Task not found' }));
            }
        }
    },
    '/comments': {
        'GET': (req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const taskId = url.searchParams.get('taskId');
            if (taskId) {
                const comments = commentService.getByTask(taskId);
                res.end(JSON.stringify(comments));
            } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: 'Missing taskId query parameter' }));
            }
        },
        'POST': async (req, res) => {
            const body = await parseBody(req);
            const { taskId, authorId } = body;
            const task = taskService.getById(taskId);
            const author = userService.getById(authorId);

            if (!task || !author) {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Task or Author not found' }));
                return;
            }

            const comment = commentService.create({
                ...body,
                taskTitle: task.title,
                authorName: author.name,
                taskAssigneeId: task.assigneeId
            });
            res.statusCode = 201;
            res.end(JSON.stringify(comment));
        }
    },
    '/comments/:id': {
        'GET': (req, res, id) => {
            const comment = commentService.getById(id!);
            if (comment) {
                res.end(JSON.stringify(comment));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Comment not found' }));
            }
        },
        'DELETE': (req, res, id) => {
            const success = commentService.delete(id!);
            if (success) {
                res.statusCode = 204;
                res.end();
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Comment not found' }));
            }
        }
    },
    '/notifications': {
        'GET': (req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const userId = url.searchParams.get('userId');
            if (userId) {
                const notifications = notificationService.getByUser(userId);
                res.end(JSON.stringify(notifications));
            } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ message: 'Missing userId query parameter' }));
            }
        }
    },
    '/notifications/:id/read': {
        'PUT': async (req, res, id) => {
            const notification = notificationService.markAsRead(id!);
            if (notification) {
                res.end(JSON.stringify(notification));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ message: 'Notification not found' }));
            }
        }
    }
};

export const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const method = req.method || 'GET';
    const path = url.pathname;

    res.setHeader('Content-Type', 'application/json');

    try {
        let handler: RouteHandler | undefined;
        let id: string | undefined;

        for (const route in routes) {
            const routeParts = route.split('/');
            const pathParts = path.split('/');

            if (routeParts.length === pathParts.length) {
                let match = true;
                let tempId: string | undefined;
                for (let i = 0; i < routeParts.length; i++) {
                    if (routeParts[i].startsWith(':')) {
                        tempId = pathParts[i];
                    } else if (routeParts[i] !== pathParts[i]) {
                        match = false;
                        break;
                    }
                }

                if (match) {
                    handler = routes[route][method];
                    id = tempId;
                    break;
                }
            }
        }

        if (handler) {
            await handler(req, res, id);
        } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'Not Found' }));
        }

    } catch (error: any) {
        console.error(error);
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'Internal Server Error', error: error.message }));
    }
});
