// API Router - HTTP request handling
import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { userService } from "./services/user-service";
import { projectService } from "./services/project-service";
import { taskService } from "./services/task-service";
import { commentService } from "./services/comment-service";
import { notificationService } from "./services/notification-service";

type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => Promise<void>;

interface Route {
  method: string;
  pattern: string;
  handler: RequestHandler;
}

export class Router {
  private routes: Route[] = [];
  private server = createServer(this.handleRequest.bind(this));

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // User routes
    this.get("/users", this.handleGetAllUsers.bind(this));
    this.post("/users", this.handleCreateUser.bind(this));
    this.get("/users/:id", this.handleGetUser.bind(this));
    this.put("/users/:id", this.handleUpdateUser.bind(this));
    this.delete("/users/:id", this.handleDeleteUser.bind(this));

    // Project routes
    this.get("/projects", this.handleGetAllProjects.bind(this));
    this.post("/projects", this.handleCreateProject.bind(this));
    this.get("/projects/:id", this.handleGetProject.bind(this));
    this.put("/projects/:id", this.handleUpdateProject.bind(this));
    this.delete("/projects/:id", this.handleDeleteProject.bind(this));
    this.post("/projects/:id/members", this.handleAddMember.bind(this));
    this.delete("/projects/:id/members", this.handleRemoveMember.bind(this));

    // Task routes
    this.get("/tasks", this.handleGetTasks.bind(this));
    this.post("/tasks", this.handleCreateTask.bind(this));
    this.get("/tasks/:id", this.handleGetTask.bind(this));
    this.put("/tasks/:id", this.handleUpdateTask.bind(this));
    this.delete("/tasks/:id", this.handleDeleteTask.bind(this));
    this.put("/tasks/:id/status", this.handleChangeStatus.bind(this));
    this.put("/tasks/:id/assign", this.handleAssignTask.bind(this));

    // Comment routes
    this.get("/comments", this.handleGetComments.bind(this));
    this.post("/comments", this.handleCreateComment.bind(this));
    this.get("/comments/:id", this.handleGetComment.bind(this));
    this.delete("/comments/:id", this.handleDeleteComment.bind(this));

    // Notification routes
    this.get("/notifications", this.handleGetNotifications.bind(this));
    this.put("/notifications/:id/read", this.handleMarkAsRead.bind(this));
  }

  // HTTP Methods
  private get(pattern: string, handler: RequestHandler): void {
    this.routes.push({ method: "GET", pattern, handler });
  }

  private post(pattern: string, handler: RequestHandler): void {
    this.routes.push({ method: "POST", pattern, handler });
  }

  private put(pattern: string, handler: RequestHandler): void {
    this.routes.push({ method: "PUT", pattern, handler });
  }

  private delete(pattern: string, handler: RequestHandler): void {
    this.routes.push({ method: "DELETE", pattern, handler });
  }

  // Request handling
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Find matching route
    for (const route of this.routes) {
      if (req.method !== route.method) continue;

      const params = this.matchPattern(pathname, route.pattern);
      if (params !== null) {
        try {
          await route.handler(req, res, params);
          return;
        } catch (error) {
          this.sendError(res, 500, error instanceof Error ? error.message : "Internal server error");
          return;
        }
      }
    }

    this.sendError(res, 404, "Route not found");
  }

  private matchPattern(
    pathname: string,
    pattern: string
  ): Record<string, string> | null {
    const patternParts = pattern.split("/").filter((p) => p);
    const pathParts = pathname.split("/").filter((p) => p);

    if (patternParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i];
      if (part.startsWith(":")) {
        params[part.substring(1)] = pathParts[i];
      } else if (part !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  private async readBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        if (data) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error("Invalid JSON"));
          }
        } else {
          resolve({});
        }
      });
      req.on("error", reject);
    });
  }

  private sendJSON(
    res: ServerResponse,
    statusCode: number,
    data: any
  ): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  private sendError(
    res: ServerResponse,
    statusCode: number,
    message: string
  ): void {
    this.sendJSON(res, statusCode, { error: message });
  }

  // User handlers
  private async handleGetAllUsers(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const users = userService.getAll();
    this.sendJSON(res, 200, users);
  }

  private async handleCreateUser(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.name || !body.email) {
      return this.sendError(res, 400, "Missing name or email");
    }
    const user = userService.create(body.name, body.email);
    this.sendJSON(res, 201, user);
  }

  private async handleGetUser(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const user = userService.getById(params.id);
    if (!user) {
      return this.sendError(res, 404, "User not found");
    }
    this.sendJSON(res, 200, user);
  }

  private async handleUpdateUser(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    const user = userService.update(params.id, body);
    if (!user) {
      return this.sendError(res, 404, "User not found");
    }
    this.sendJSON(res, 200, user);
  }

  private async handleDeleteUser(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const success = userService.delete(params.id);
    if (!success) {
      return this.sendError(res, 404, "User not found");
    }
    this.sendJSON(res, 200, { success: true });
  }

  // Project handlers
  private async handleGetAllProjects(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const projects = projectService.getAll();
    this.sendJSON(res, 200, projects);
  }

  private async handleCreateProject(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.name || !body.description) {
      return this.sendError(res, 400, "Missing name or description");
    }
    const project = projectService.create(body.name, body.description);
    this.sendJSON(res, 201, project);
  }

  private async handleGetProject(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const project = projectService.getById(params.id);
    if (!project) {
      return this.sendError(res, 404, "Project not found");
    }
    this.sendJSON(res, 200, project);
  }

  private async handleUpdateProject(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    const project = projectService.update(params.id, body);
    if (!project) {
      return this.sendError(res, 404, "Project not found");
    }
    this.sendJSON(res, 200, project);
  }

  private async handleDeleteProject(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const success = projectService.delete(params.id);
    if (!success) {
      return this.sendError(res, 404, "Project not found");
    }
    this.sendJSON(res, 200, { success: true });
  }

  private async handleAddMember(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.userId) {
      return this.sendError(res, 400, "Missing userId");
    }
    const project = projectService.addMember(params.id, body.userId);
    if (!project) {
      return this.sendError(res, 404, "Project not found");
    }
    this.sendJSON(res, 200, project);
  }

  private async handleRemoveMember(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.userId) {
      return this.sendError(res, 400, "Missing userId");
    }
    const project = projectService.removeMember(params.id, body.userId);
    if (!project) {
      return this.sendError(res, 404, "Project not found");
    }
    this.sendJSON(res, 200, project);
  }

  // Task handlers
  private async handleGetTasks(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const projectId = url.searchParams.get("projectId");

    let tasks;
    if (projectId) {
      tasks = taskService.getByProject(projectId);
    } else {
      tasks = taskService.getAll();
    }

    this.sendJSON(res, 200, tasks);
  }

  private async handleCreateTask(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.title || !body.projectId) {
      return this.sendError(res, 400, "Missing title or projectId");
    }
    const task = taskService.create(
      body.title,
      body.description || "",
      body.projectId,
      body.assigneeId
    );
    this.sendJSON(res, 201, task);
  }

  private async handleGetTask(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const task = taskService.getById(params.id);
    if (!task) {
      return this.sendError(res, 404, "Task not found");
    }
    this.sendJSON(res, 200, task);
  }

  private async handleUpdateTask(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    const task = taskService.update(params.id, body);
    if (!task) {
      return this.sendError(res, 404, "Task not found");
    }
    this.sendJSON(res, 200, task);
  }

  private async handleDeleteTask(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const success = taskService.delete(params.id);
    if (!success) {
      return this.sendError(res, 404, "Task not found");
    }
    this.sendJSON(res, 200, { success: true });
  }

  private async handleChangeStatus(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.status) {
      return this.sendError(res, 400, "Missing status");
    }
    try {
      const task = taskService.changeStatus(params.id, body.status);
      if (!task) {
        return this.sendError(res, 404, "Task not found");
      }
      this.sendJSON(res, 200, task);
    } catch (error) {
      this.sendError(
        res,
        400,
        error instanceof Error ? error.message : "Status change failed"
      );
    }
  }

  private async handleAssignTask(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.assigneeId) {
      return this.sendError(res, 400, "Missing assigneeId");
    }
    const task = taskService.assign(params.id, body.assigneeId);
    if (!task) {
      return this.sendError(res, 404, "Task not found");
    }
    this.sendJSON(res, 200, task);
  }

  // Comment handlers
  private async handleGetComments(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const taskId = url.searchParams.get("taskId");

    const comments = taskId ? commentService.getByTask(taskId) : [];

    this.sendJSON(res, 200, comments);
  }

  private async handleCreateComment(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    if (!body.taskId || !body.authorId || !body.body) {
      return this.sendError(
        res,
        400,
        "Missing taskId, authorId, or body"
      );
    }

    try {
      const comment = commentService.create(
        body.taskId,
        body.authorId,
        body.body
      );
      this.sendJSON(res, 201, comment);
    } catch (error) {
      this.sendError(
        res,
        400,
        error instanceof Error ? error.message : "Comment creation failed"
      );
    }
  }

  private async handleGetComment(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const comment = commentService.getById(params.id);
    if (!comment) {
      return this.sendError(res, 404, "Comment not found");
    }
    this.sendJSON(res, 200, comment);
  }

  private async handleDeleteComment(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const success = commentService.delete(params.id);
    if (!success) {
      return this.sendError(res, 404, "Comment not found");
    }
    this.sendJSON(res, 200, { success: true });
  }

  // Notification handlers
  private async handleGetNotifications(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return this.sendError(res, 400, "Missing userId");
    }

    const notifications = notificationService.getByUser(userId);
    this.sendJSON(res, 200, notifications);
  }

  private async handleMarkAsRead(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ): Promise<void> {
    const notification = notificationService.markAsRead(params.id);
    if (!notification) {
      return this.sendError(res, 404, "Notification not found");
    }
    this.sendJSON(res, 200, notification);
  }

  // Server lifecycle
  public listen(port: number): void {
    this.server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }

  public close(): void {
    this.server.close();
  }
}
