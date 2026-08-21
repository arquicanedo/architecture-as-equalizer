import http from "http";
import { URL } from "url";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService, TaskStatus } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

export class ApiRouter {
    constructor(
        private readonly userService: UserService,
        private readonly projectService: ProjectService,
        private readonly taskService: TaskService,
        private readonly commentService: CommentService,
        private readonly notificationService: NotificationService
    ) {}

    public handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const { method, url } = req;
        const { pathname, searchParams } = new URL(url!, `http://${req.headers.host}`);

        res.setHeader("Content-Type", "application/json");

        this.parseJsonBody(req).then(body => {
            try {
                // USER ROUTES
                if (pathname === "/users" && method === "GET") {
                    const users = this.userService.getAll();
                    this.sendResponse(res, 200, users);
                } else if (pathname === "/users" && method === "POST") {
                    const { name, email } = body;
                    const user = this.userService.create(name, email);
                    this.sendResponse(res, 201, user);
                } else if (pathname.startsWith("/users/") && method === "GET") {
                    const id = pathname.split("/")[2];
                    const user = this.userService.getById(id);
                    user ? this.sendResponse(res, 200, user) : this.sendResponse(res, 404, { message: "User not found" });
                } else if (pathname.startsWith("/users/") && method === "PUT") {
                    const id = pathname.split("/")[2];
                    const { name, email } = body;
                    const user = this.userService.update(id, name, email);
                    user ? this.sendResponse(res, 200, user) : this.sendResponse(res, 404, { message: "User not found" });
                } else if (pathname.startsWith("/users/") && method === "DELETE") {
                    const id = pathname.split("/")[2];
                    const success = this.userService.delete(id);
                    success ? this.sendResponse(res, 204) : this.sendResponse(res, 404, { message: "User not found" });
                }
                // PROJECT ROUTES
                else if (pathname === "/projects" && method === "GET") {
                    const projects = this.projectService.getAll();
                    this.sendResponse(res, 200, projects);
                } else if (pathname === "/projects" && method === "POST") {
                    const { name, description } = body;
                    const project = this.projectService.create(name, description);
                    this.sendResponse(res, 201, project);
                } else if (pathname.startsWith("/projects/") && !pathname.includes("/members") && method === "GET") {
                    const id = pathname.split("/")[2];
                    const project = this.projectService.getById(id);
                    project ? this.sendResponse(res, 200, project) : this.sendResponse(res, 404, { message: "Project not found" });
                } else if (pathname.startsWith("/projects/") && !pathname.includes("/members") && method === "PUT") {
                    const id = pathname.split("/")[2];
                    const { name, description } = body;
                    const project = this.projectService.update(id, name, description);
                    project ? this.sendResponse(res, 200, project) : this.sendResponse(res, 404, { message: "Project not found" });
                } else if (pathname.startsWith("/projects/") && !pathname.includes("/members") && method === "DELETE") {
                    const id = pathname.split("/")[2];
                    const success = this.projectService.delete(id);
                    success ? this.sendResponse(res, 204) : this.sendResponse(res, 404, { message: "Project not found" });
                } else if (pathname.startsWith("/projects/") && pathname.endsWith("/members") && method === "POST") {
                    const id = pathname.split("/")[2];
                    const { memberId } = body;
                    const project = this.projectService.addMember(id, memberId);
                    project ? this.sendResponse(res, 200, project) : this.sendResponse(res, 404, { message: "Project not found" });
                } else if (pathname.startsWith("/projects/") && pathname.endsWith("/members") && method === "DELETE") {
                    const id = pathname.split("/")[2];
                    const { memberId } = body;
                    const project = this.projectService.removeMember(id, memberId);
                    project ? this.sendResponse(res, 200, project) : this.sendResponse(res, 404, { message: "Project or member not found" });
                }
                // TASK ROUTES
                else if (pathname === "/tasks" && method === "GET") {
                    const projectId = searchParams.get("projectId");
                    if (!projectId) return this.sendResponse(res, 400, { message: "Missing projectId query parameter" });
                    const tasks = this.taskService.getByProject(projectId);
                    this.sendResponse(res, 200, tasks);
                } else if (pathname === "/tasks" && method === "POST") {
                    const { title, description, projectId } = body;
                    const task = this.taskService.create(title, description, projectId);
                    this.sendResponse(res, 201, task);
                } else if (pathname.startsWith("/tasks/") && !pathname.includes("/status") && !pathname.includes("/assign") && method === "GET") {
                    const id = pathname.split("/")[2];
                    const task = this.taskService.getById(id);
                    task ? this.sendResponse(res, 200, task) : this.sendResponse(res, 404, { message: "Task not found" });
                } else if (pathname.startsWith("/tasks/") && !pathname.includes("/status") && !pathname.includes("/assign") && method === "PUT") {
                    const id = pathname.split("/")[2];
                    const { title, description } = body;
                    const task = this.taskService.update(id, title, description);
                    task ? this.sendResponse(res, 200, task) : this.sendResponse(res, 404, { message: "Task not found" });
                } else if (pathname.startsWith("/tasks/") && !pathname.includes("/status") && !pathname.includes("/assign") && method === "DELETE") {
                    const id = pathname.split("/")[2];
                    const success = this.taskService.delete(id);
                    success ? this.sendResponse(res, 204) : this.sendResponse(res, 404, { message: "Task not found" });
                } else if (pathname.startsWith("/tasks/") && pathname.endsWith("/status") && method === "PUT") {
                    const id = pathname.split("/")[2];
                    const { status } = body as { status: TaskStatus };
                    const task = this.taskService.changeStatus(id, status);
                    task ? this.sendResponse(res, 200, task) : this.sendResponse(res, 400, { message: "Invalid status transition or task not found" });
                } else if (pathname.startsWith("/tasks/") && pathname.endsWith("/assign") && method === "PUT") {
                    const id = pathname.split("/")[2];
                    const { assigneeId } = body;
                    const task = this.taskService.assign(id, assigneeId);
                    task ? this.sendResponse(res, 200, task) : this.sendResponse(res, 404, { message: "Task not found" });
                }
                // COMMENT ROUTES
                else if (pathname === "/comments" && method === "GET") {
                    const taskId = searchParams.get("taskId");
                    if (!taskId) return this.sendResponse(res, 400, { message: "Missing taskId query parameter" });
                    const comments = this.commentService.getByTask(taskId);
                    this.sendResponse(res, 200, comments);
                } else if (pathname === "/comments" && method === "POST") {
                    const { taskId, authorId, body: commentBody } = body;
                    const task = this.taskService.getById(taskId);
                    const author = this.userService.getById(authorId);
                    if (!task || !author) {
                        return this.sendResponse(res, 404, { message: "Task or Author not found" });
                    }
                    const comment = this.commentService.create(taskId, authorId, commentBody, task.title, author.name, task.assigneeId);
                    this.sendResponse(res, 201, comment);
                } else if (pathname.startsWith("/comments/") && method === "GET") {
                    const id = pathname.split("/")[2];
                    const comment = this.commentService.getById(id);
                    comment ? this.sendResponse(res, 200, comment) : this.sendResponse(res, 404, { message: "Comment not found" });
                } else if (pathname.startsWith("/comments/") && method === "DELETE") {
                    const id = pathname.split("/")[2];
                    const success = this.commentService.delete(id);
                    success ? this.sendResponse(res, 204) : this.sendResponse(res, 404, { message: "Comment not found" });
                }
                // NOTIFICATION ROUTES
                else if (pathname === "/notifications" && method === "GET") {
                    const userId = searchParams.get("userId");
                    if (!userId) return this.sendResponse(res, 400, { message: "Missing userId query parameter" });
                    const notifications = this.notificationService.getByUser(userId);
                    this.sendResponse(res, 200, notifications);
                } else if (pathname.startsWith("/notifications/") && pathname.endsWith("/read") && method === "PUT") {
                    const id = pathname.split("/")[2];
                    const notification = this.notificationService.markAsRead(id);
                    notification ? this.sendResponse(res, 200, notification) : this.sendResponse(res, 404, { message: "Notification not found" });
                }
                // NOT FOUND
                else {
                    this.sendResponse(res, 404, { message: "Not Found" });
                }
            } catch (error) {
                console.error(error);
                this.sendResponse(res, 500, { message: "Internal Server Error" });
            }
        }).catch(err => {
            this.sendResponse(res, 400, { message: "Invalid JSON payload" });
        });
    }

    private parseJsonBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            if (req.method === 'GET' || req.method === 'DELETE') {
                return resolve({});
            }

            let body = "";
            req.on("data", chunk => { body += chunk.toString(); });
            req.on("end", () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (error) {
                    reject(error);
                }
            });
            req.on('error', (err) => {
                reject(err);
            });
        });
    }

    private sendResponse(res: http.ServerResponse, statusCode: number, data?: any) {
        res.statusCode = statusCode;
        if (data) {
            res.end(JSON.stringify(data));
        } else {
            res.end();
        }
    }
}