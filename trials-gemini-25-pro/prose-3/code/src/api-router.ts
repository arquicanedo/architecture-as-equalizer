import * as http from 'http';
import { URL } from 'url';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService, TaskStatus } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { EventBus } from './event-bus';

export class ApiRouter {
    constructor(
        private userService: UserService,
        private projectService: ProjectService,
        private taskService: TaskService,
        private commentService: CommentService,
        private notificationService: NotificationService,
        private eventBus: EventBus
    ) {}

    public handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const { method, url } = req;
        const parsedUrl = new URL(url || '', `http://${req.headers.host}`);
        const path = parsedUrl.pathname;

        res.setHeader('Content-Type', 'application/json');

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const jsonBody = body ? JSON.parse(body) : {};

            try {
                // User Routes
                if (path === '/users' && method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify(this.userService.getAllUsers()));
                } else if (path === '/users' && method === 'POST') {
                    const { name, email } = jsonBody;
                    const user = this.userService.createUser(name, email);
                    res.writeHead(201);
                    res.end(JSON.stringify(user));
                } else if (path.startsWith('/users/') && method === 'GET') {
                    const id = path.split('/')[2];
                    const user = this.userService.getUser(id);
                    if(user) {
                        res.writeHead(200);
                        res.end(JSON.stringify(user));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'User not found' }));
                    }
                } // ... other user routes PUT, DELETE

                // Project Routes
                else if (path === '/projects' && method === 'POST') {
                    const { name, description, ownerId } = jsonBody;
                    const project = this.projectService.createProject(name, description, ownerId);
                    res.writeHead(201);
                    res.end(JSON.stringify(project));
                } else if (path === '/projects' && method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify(this.projectService.getAllProjects()));
                } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'POST') {
                    const projectId = path.split('/')[2];
                    const { userId } = jsonBody;
                    const project = this.projectService.addMemberToProject(projectId, userId);
                     if(project) {
                        res.writeHead(200);
                        res.end(JSON.stringify(project));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'Project not found' }));
                    }
                }

                // Task Routes
                else if (path === '/tasks' && method === 'GET') {
                    const projectId = parsedUrl.searchParams.get('projectId');
                    if (projectId) {
                        res.writeHead(200);
                        res.end(JSON.stringify(this.taskService.getTasksByProject(projectId)));
                    } else {
                        res.writeHead(400);
                        res.end(JSON.stringify({ message: 'projectId is required' }));
                    }
                } else if (path === '/tasks' && method === 'POST') {
                    const { projectId, title, description } = jsonBody;
                    const task = this.taskService.createTask(projectId, title, description);
                    res.writeHead(201);
                    res.end(JSON.stringify(task));
                } else if (path.startsWith('/tasks/') && path.endsWith('/status') && method === 'PUT') {
                    const taskId = path.split('/')[2];
                    const { status } = jsonBody as { status: TaskStatus };
                    const task = this.taskService.updateTaskStatus(taskId, status);
                    if (task) {
                        res.writeHead(200);
                        res.end(JSON.stringify(task));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'Task not found or invalid status transition' }));
                    }
                } else if (path.startsWith('/tasks/') && path.endsWith('/assign') && method === 'PUT') {
                    const taskId = path.split('/')[2];
                    const { assigneeId } = jsonBody;
                    const task = this.taskService.assignTask(taskId, assigneeId);
                    if (task) {
                        res.writeHead(200);
                        res.end(JSON.stringify(task));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'Task not found' }));
                    }
                } else if (path.startsWith('/tasks/') && method === 'GET') {
                    const id = path.split('/')[2];
                    const task = this.taskService.getTask(id);
                    if(task) {
                        res.writeHead(200);
                        res.end(JSON.stringify(task));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'Task not found' }));
                    }
                }

                // Comment Routes
                else if (path === '/comments' && method === 'POST') {
                    const { taskId, authorId, text } = jsonBody;
                    const task = this.taskService.getTask(taskId);
                    if(task){
                        const comment = this.commentService.addComment(taskId, authorId, text);
                        this.eventBus.publish('comment.added', { ...comment, taskAssigneeId: task.assigneeId });
                        res.writeHead(201);
                        res.end(JSON.stringify(comment));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'Task not found' }));
                    }
                } else if (path === '/comments' && method === 'GET') {
                    const taskId = parsedUrl.searchParams.get('taskId');
                    if (taskId) {
                        res.writeHead(200);
                        res.end(JSON.stringify(this.commentService.getCommentsByTask(taskId)));
                    } else {
                        res.writeHead(400);
                        res.end(JSON.stringify({ message: 'taskId is required' }));
                    }
                }

                // Notification Routes
                else if (path === '/notifications' && method === 'GET') {
                    const userId = parsedUrl.searchParams.get('userId');
                     if (userId) {
                        res.writeHead(200);
                        res.end(JSON.stringify(this.notificationService.getNotificationsForUser(userId)));
                    } else {
                        res.writeHead(400);
                        res.end(JSON.stringify({ message: 'userId is required' }));
                    }
                } else if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
                    const notificationId = path.split('/')[2];
                    const notification = this.notificationService.markAsRead(notificationId);
                     if (notification) {
                        res.writeHead(200);
                        res.end(JSON.stringify(notification));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ message: 'Notification not found' }));
                    }
                }

                else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ message: 'Route not found' }));
                }
            } catch (error) {
                console.error(error);
                res.writeHead(500);
                res.end(JSON.stringify({ message: 'Internal Server Error' }));
            }
        });
    }
}
