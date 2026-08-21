import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

async function parseJSONBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

export class ApiRouter {
    constructor(
        private userService: UserService,
        private projectService: ProjectService,
        private taskService: TaskService,
        private commentService: CommentService,
        private notificationService: NotificationService,
    ) {}

    public async handle(req: IncomingMessage, res: ServerResponse) {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const method = req.method;
        const path = url.pathname;
        
        res.setHeader('Content-Type', 'application/json');

        try {
            // User routes
            if (path === '/users' && method === 'GET') {
                const users = this.userService.listUsers();
                res.writeHead(200).end(JSON.stringify(users));
            } else if (path === '/users' && method === 'POST') {
                const body = await parseJSONBody(req);
                const user = this.userService.createUser(body);
                res.writeHead(201).end(JSON.stringify(user));
            } else if (path.startsWith('/users/') && method === 'GET') {
                const id = path.split('/')[2];
                const user = this.userService.getUser(id);
                if(user) res.writeHead(200).end(JSON.stringify(user));
                else res.writeHead(404).end(JSON.stringify({ message: 'User not found' }));
            } else if (path.startsWith('/users/') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const user = this.userService.updateUser(id, body);
                if(user) res.writeHead(200).end(JSON.stringify(user));
                else res.writeHead(404).end(JSON.stringify({ message: 'User not found' }));
            } else if (path.startsWith('/users/') && method === 'DELETE') {
                const id = path.split('/')[2];
                if(this.userService.deleteUser(id)) res.writeHead(204).end();
                else res.writeHead(404).end(JSON.stringify({ message: 'User not found' }));
            }

            // Project routes
            else if (path === '/projects' && method === 'GET') {
                const projects = this.projectService.listProjects();
                res.writeHead(200).end(JSON.stringify(projects));
            } else if (path === '/projects' && method === 'POST') {
                const body = await parseJSONBody(req);
                const project = this.projectService.createProject(body);
                res.writeHead(201).end(JSON.stringify(project));
            } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'POST') {
                 const id = path.split('/')[2];
                 const body = await parseJSONBody(req);
                 const project = this.projectService.addMemberToProject(id, body.userId);
                 if (project) res.writeHead(200).end(JSON.stringify(project));
                 else res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
            } else if (path.startsWith('/projects/') && path.endsWith('/members') && method === 'DELETE') {
                 const id = path.split('/')[2];
                 const body = await parseJSONBody(req);
                 const project = this.projectService.removeMemberFromProject(id, body.userId);
                 if (project) res.writeHead(200).end(JSON.stringify(project));
                 else res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
            } else if (path.startsWith('/projects/') && method === 'GET') {
                const id = path.split('/')[2];
                const project = this.projectService.getProject(id);
                if(project) res.writeHead(200).end(JSON.stringify(project));
                else res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
            } else if (path.startsWith('/projects/') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const project = this.projectService.updateProject(id, body);
                if(project) res.writeHead(200).end(JSON.stringify(project));
                else res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
            } else if (path.startsWith('/projects/') && method === 'DELETE') {
                const id = path.split('/')[2];
                if(this.projectService.deleteProject(id)) res.writeHead(204).end();
                else res.writeHead(404).end(JSON.stringify({ message: 'Project not found' }));
            }

            // Task routes
            else if (path === '/tasks' && method === 'GET') {
                const projectId = url.searchParams.get('projectId');
                if(!projectId) res.writeHead(400).end(JSON.stringify({ message: 'Missing projectId query parameter' }));
                else {
                    const tasks = this.taskService.listTasksByProject(projectId);
                    res.writeHead(200).end(JSON.stringify(tasks));
                }
            } else if (path === '/tasks' && method === 'POST') {
                const body = await parseJSONBody(req);
                const task = this.taskService.createTask(body);
                res.writeHead(201).end(JSON.stringify(task));
            } else if (path.startsWith('/tasks/') && path.endsWith('/status') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const result = this.taskService.updateTaskStatus(id, body.status);
                if (!result) {
                    res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
                } else if ('error' in result) {
                    res.writeHead(400).end(JSON.stringify({ message: result.error }));
                } else {
                    res.writeHead(200).end(JSON.stringify(result));
                }
            } else if (path.startsWith('/tasks/') && path.endsWith('/assign') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const task = this.taskService.assignTask(id, body.assigneeId);
                if (task) res.writeHead(200).end(JSON.stringify(task));
                else res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
            } else if (path.startsWith('/tasks/') && method === 'GET') {
                const id = path.split('/')[2];
                const task = this.taskService.getTask(id);
                if(task) res.writeHead(200).end(JSON.stringify(task));
                else res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
            } else if (path.startsWith('/tasks/') && method === 'PUT') {
                const id = path.split('/')[2];
                const body = await parseJSONBody(req);
                const task = this.taskService.updateTask(id, body);
                if(task) res.writeHead(200).end(JSON.stringify(task));
                else res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
            } else if (path.startsWith('/tasks/') && method === 'DELETE') {
                const id = path.split('/')[2];
                if(this.taskService.deleteTask(id)) res.writeHead(204).end();
                else res.writeHead(404).end(JSON.stringify({ message: 'Task not found' }));
            }

            // Comment routes
            else if (path === '/comments' && method === 'GET') {
                const taskId = url.searchParams.get('taskId');
                 if(!taskId) res.writeHead(400).end(JSON.stringify({ message: 'Missing taskId query parameter' }));
                else {
                    const comments = this.commentService.listCommentsByTask(taskId);
                    res.writeHead(200).end(JSON.stringify(comments));
                }
            } else if (path === '/comments' && method === 'POST') {
                const body = await parseJSONBody(req);
                const task = this.taskService.getTask(body.taskId);
                const author = this.userService.getUser(body.authorId);
                if (!task || !author) {
                     res.writeHead(404).end(JSON.stringify({ message: 'Task or Author not found' }));
                     return;
                }
                const comment = this.commentService.createComment(body, task.title, author.name, task.assigneeId);
                res.writeHead(201).end(JSON.stringify(comment));
            } else if (path.startsWith('/comments/') && method === 'GET') {
                const id = path.split('/')[2];
                const comment = this.commentService.getComment(id);
                if(comment) res.writeHead(200).end(JSON.stringify(comment));
                else res.writeHead(404).end(JSON.stringify({ message: 'Comment not found' }));
            } else if (path.startsWith('/comments/') && method === 'DELETE') {
                const id = path.split('/')[2];
                if(this.commentService.deleteComment(id)) res.writeHead(204).end();
                else res.writeHead(404).end(JSON.stringify({ message: 'Comment not found' }));
            }
            
            // Notification routes
            else if (path === '/notifications' && method === 'GET') {
                const userId = url.searchParams.get('userId');
                 if(!userId) res.writeHead(400).end(JSON.stringify({ message: 'Missing userId query parameter' }));
                else {
                    const notifications = this.notificationService.listNotificationsForUser(userId);
                    res.writeHead(200).end(JSON.stringify(notifications));
                }
            } else if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'PUT') {
                 const id = path.split('/')[2];
                 const notification = this.notificationService.markNotificationAsRead(id);
                 if (notification) res.writeHead(200).end(JSON.stringify(notification));
                 else res.writeHead(404).end(JSON.stringify({ message: 'Notification not found' }));
            }

            // Not found
            else {
                res.writeHead(404).end(JSON.stringify({ message: 'Not Found' }));
            }
        } catch (error) {
            console.error(error);
            res.writeHead(500).end(JSON.stringify({ message: 'Internal Server Error' }));
        }
    }
}
