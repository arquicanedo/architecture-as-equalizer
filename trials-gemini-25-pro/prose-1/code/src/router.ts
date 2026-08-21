
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
    ) {}

    public handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const { method, url } = req;
        const urlObject = new URL(url || '', `http://${req.headers.host}`);
        const path = urlObject.pathname;

        res.setHeader('Content-Type', 'application/json');

        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const requestBody = body ? JSON.parse(body) : {};
                // User routes
                if (path === '/users' && method === 'GET') {
                    res.end(JSON.stringify(this.userService.getAllUsers()));
                } else if (path === '/users' && method === 'POST') {
                    const { name, email } = requestBody;
                    res.end(JSON.stringify(this.userService.createUser(name, email)));
                } else if (path.startsWith('/users/') && method === 'GET') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify(this.userService.getUser(id)));
                } else if (path.startsWith('/users/') && method === 'PUT') {
                    const id = path.split('/')[2];
                    const { name, email } = requestBody;
                    res.end(JSON.stringify(this.userService.updateUser(id, name, email)));
                } else if (path.startsWith('/users/') && method === 'DELETE') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify({ success: this.userService.deleteUser(id) }));
                } 
                // Project routes
                else if (path === '/projects' && method === 'GET') {
                    res.end(JSON.stringify(this.projectService.getAllProjects()));
                } else if (path === '/projects' && method === 'POST') {
                    const { name, description } = requestBody;
                    res.end(JSON.stringify(this.projectService.createProject(name, description)));
                } else if (path.startsWith('/projects/') && method === 'GET') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify(this.projectService.getProject(id)));
                } else if (path.startsWith('/projects/') && method === 'PUT') {
                    const id = path.split('/')[2];
                    const { name, description } = requestBody;
                    res.end(JSON.stringify(this.projectService.updateProject(id, name, description)));
                } else if (path.startsWith('/projects/') && method === 'DELETE') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify({ success: this.projectService.deleteProject(id) }));
                } else if (path.includes('/members') && method === 'POST') {
                    const id = path.split('/')[2];
                    const { memberId } = requestBody;
                    res.end(JSON.stringify(this.projectService.addMemberToProject(id, memberId)));
                } else if (path.includes('/members') && method === 'DELETE') {
                    const id = path.split('/')[2];
                    const { memberId } = requestBody;
                    res.end(JSON.stringify(this.projectService.removeMemberFromProject(id, memberId)));
                }
                // Task routes
                else if (path === '/tasks' && method === 'GET') {
                    const projectId = urlObject.searchParams.get('projectId');
                    if(projectId) {
                        res.end(JSON.stringify(this.taskService.getTasksByProject(projectId)));
                    }
                } else if (path === '/tasks' && method === 'POST') {
                    const { projectId, title, description } = requestBody;
                    res.end(JSON.stringify(this.taskService.createTask(projectId, title, description)));
                } else if (path.startsWith('/tasks/') && path.endsWith('/status') && method === 'PUT') {
                    const id = path.split('/')[2];
                    const { status } = requestBody;
                    res.end(JSON.stringify(this.taskService.updateTaskStatus(id, status)));
                } else if (path.startsWith('/tasks/') && path.endsWith('/assign') && method === 'PUT') {
                    const id = path.split('/')[2];
                    const { assigneeId } = requestBody;
                    res.end(JSON.stringify(this.taskService.assignTask(id, assigneeId)));
                } else if (path.startsWith('/tasks/') && method === 'GET') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify(this.taskService.getTask(id)));
                } else if (path.startsWith('/tasks/') && method === 'PUT') {
                    const id = path.split('/')[2];
                    const { title, description } = requestBody;
                    res.end(JSON.stringify(this.taskService.updateTask(id, title, description)));
                } else if (path.startsWith('/tasks/') && method === 'DELETE') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify({ success: this.taskService.deleteTask(id) }));
                }
                // Comment routes
                else if (path === '/comments' && method === 'GET') {
                    const taskId = urlObject.searchParams.get('taskId');
                    if(taskId) {
                        res.end(JSON.stringify(this.commentService.getCommentsByTask(taskId)));
                    }
                } else if (path === '/comments' && method === 'POST') {
                    const { taskId, authorId, text } = requestBody;
                    res.end(JSON.stringify(this.commentService.createComment(taskId, authorId, text)));
                } else if (path.startsWith('/comments/') && method === 'GET') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify(this.commentService.getComment(id)));
                } else if (path.startsWith('/comments/') && method === 'DELETE') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify({ success: this.commentService.deleteComment(id) }));
                }
                // Notification routes
                else if (path === '/notifications' && method === 'GET') {
                    const userId = urlObject.searchParams.get('userId');
                    if(userId) {
                        res.end(JSON.stringify(this.notificationService.getNotificationsForUser(userId)));
                    }
                } else if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
                    const id = path.split('/')[2];
                    res.end(JSON.stringify(this.notificationService.markAsRead(id)));
                }
                // Default
                else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'Not Found' }));
                }
            } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
        });
    }
}
