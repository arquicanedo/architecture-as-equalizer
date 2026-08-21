import * as http from 'http';
import { URL } from 'url';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';

export class ApiRouter {
    constructor(
        private userService: UserService,
        private projectService: ProjectService,
        private taskService: TaskService,
        private commentService: CommentService,
        private notificationService: NotificationService
    ) { }

    handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const { method, url } = req;
        const { pathname, searchParams } = new URL(url || '', `http://${req.headers.host}`);

        res.setHeader('Content-Type', 'application/json');

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const requestBody = body ? JSON.parse(body) : {};

                // User routes
                if (pathname === '/users' && method === 'GET') {
                    const users = this.userService.getUsers();
                    res.writeHead(200).end(JSON.stringify(users));
                } else if (pathname === '/users' && method === 'POST') {
                    const { name, email } = requestBody;
                    const user = this.userService.createUser(name, email);
                    res.writeHead(201).end(JSON.stringify(user));
                } else if (pathname.startsWith('/users/') && method === 'GET') {
                    const id = pathname.split('/')[2];
                    const user = this.userService.getUser(id);
                    if (user) {
                        res.writeHead(200).end(JSON.stringify(user));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'User not found' }));
                    }
                } else if (pathname.startsWith('/users/') && method === 'PUT') {
                    const id = pathname.split('/')[2];
                    const { name, email } = requestBody;
                    const user = this.userService.updateUser(id, name, email);
                    if (user) {
                        res.writeHead(200).end(JSON.stringify(user));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'User not found' }));
                    }
                } else if (pathname.startsWith('/users/') && method === 'DELETE') {
                    const id = pathname.split('/')[2];
                    const success = this.userService.deleteUser(id);
                    if (success) {
                        res.writeHead(204).end();
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'User not found' }));
                    }
                }

                // Project routes
                else if (pathname === '/projects' && method === 'GET') {
                    const projects = this.projectService.getProjects();
                    res.writeHead(200).end(JSON.stringify(projects));
                } else if (pathname === '/projects' && method === 'POST') {
                    const { name, description } = requestBody;
                    const project = this.projectService.createProject(name, description);
                    res.writeHead(201).end(JSON.stringify(project));
                } else if (pathname.startsWith('/projects/') && method === 'GET') {
                    const id = pathname.split('/')[2];
                    const project = this.projectService.getProject(id);
                    if (project) {
                        res.writeHead(200).end(JSON.stringify(project));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
                    }
                } else if (pathname.startsWith('/projects/') && pathname.endsWith('/members') && method === 'POST') {
                    const projectId = pathname.split('/')[2];
                    const { userId } = requestBody;
                    const project = this.projectService.addMemberToProject(projectId, userId);
                    if (project) {
                        res.writeHead(200).end(JSON.stringify(project));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
                    }
                } else if (pathname.startsWith('/projects/') && pathname.endsWith('/members') && method === 'DELETE') {
                    const projectId = pathname.split('/')[2];
                    const { userId } = requestBody;
                    const project = this.projectService.removeMemberFromProject(projectId, userId);
                    if (project) {
                        res.writeHead(200).end(JSON.stringify(project));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
                    }
                }

                // Task routes
                else if (pathname === '/tasks' && method === 'GET') {
                    const projectId = searchParams.get('projectId');
                    if (projectId) {
                        const tasks = this.taskService.getTasksByProject(projectId);
                        res.writeHead(200).end(JSON.stringify(tasks));
                    } else {
                        res.writeHead(400).end(JSON.stringify({ message: 'Missing projectId query parameter' }));
                    }
                } else if (pathname === '/tasks' && method === 'POST') {
                    const { projectId, title, description } = requestBody;
                    const task = this.taskService.createTask(projectId, title, description);
                    res.writeHead(201).end(JSON.stringify(task));
                } else if (pathname.startsWith('/tasks/') && method === 'GET') {
                    const id = pathname.split('/')[2];
                    const task = this.taskService.getTask(id);
                    if (task) {
                        res.writeHead(200).end(JSON.stringify(task));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
                    }
                } else if (pathname.startsWith('/tasks/') && pathname.endsWith('/status') && method === 'PUT') {
                    const taskId = pathname.split('/')[2];
                    const { status } = requestBody;
                    const task = this.taskService.updateTaskStatus(taskId, status);
                    if (task) {
                        res.writeHead(200).end(JSON.stringify(task));
                    } else {
                        res.writeHead(400).end(JSON.stringify({ message: 'Invalid status transition or task not found' }));
                    }
                } else if (pathname.startsWith('/tasks/') && pathname.endsWith('/assign') && method === 'PUT') {
                    const taskId = pathname.split('/')[2];
                    const { assigneeId } = requestBody;
                    const task = this.taskService.assignTask(taskId, assigneeId);
                    if (task) {
                        res.writeHead(200).end(JSON.stringify(task));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
                    }
                }

                // Comment routes
                else if (pathname === '/comments' && method === 'GET') {
                    const taskId = searchParams.get('taskId');
                    if (taskId) {
                        const comments = this.commentService.getCommentsByTask(taskId);
                        res.writeHead(200).end(JSON.stringify(comments));
                    } else {
                        res.writeHead(400).end(JSON.stringify({ message: 'Missing taskId query parameter' }));
                    }
                } else if (pathname === '/comments' && method === 'POST') {
                    const { taskId, authorId, text } = requestBody;
                    const comment = this.commentService.addComment(taskId, authorId, text);
                    res.writeHead(201).end(JSON.stringify(comment));
                }

                // Notification routes
                else if (pathname === '/notifications' && method === 'GET') {
                    const userId = searchParams.get('userId');
                    if (userId) {
                        const notifications = this.notificationService.getNotificationsForUser(userId);
                        res.writeHead(200).end(JSON.stringify(notifications));
                    } else {
                        res.writeHead(400).end(JSON.stringify({ message: 'Missing userId query parameter' }));
                    }
                } else if (pathname.startsWith('/notifications/') && pathname.endsWith('/read') && method === 'PUT') {
                    const notificationId = pathname.split('/')[2];
                    const notification = this.notificationService.markAsRead(notificationId);
                    if (notification) {
                        res.writeHead(200).end(JSON.stringify(notification));
                    } else {
                        res.writeHead(404).end(JSON.stringify({ message: 'Notification not found' }));
                    }
                }

                // Not found
                else {
                    res.writeHead(404).end(JSON.stringify({ message: 'Not Found' }));
                }
            } catch (error) {
                console.error('Error handling request:', error);
                res.writeHead(500).end(JSON.stringify({ message: 'Internal Server Error' }));
            }
        });
    }
}
