import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

export class Router {
  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private commentService: CommentService,
    private notificationService: NotificationService
  ) {}

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const method = req.method || "GET";
    const searchParams = url.searchParams;

    try {
      // User routes
      if (pathname === "/users" && method === "GET") {
        const users = this.userService.getAll();
        return this.sendJson(res, 200, users);
      }

      if (pathname === "/users" && method === "POST") {
        const body = await this.parseBody(req);
        const user = this.userService.create(body as { name: string; email: string });
        return this.sendJson(res, 201, user);
      }

      const userMatch = pathname.match(/^\/users\/([^/]+)$/);
      if (userMatch && method === "GET") {
        const id = userMatch[1];
        const user = this.userService.getById(id);
        return this.sendJson(res, 200, user);
      }

      if (userMatch && method === "PUT") {
        const id = userMatch[1];
        const body = await this.parseBody(req);
        const user = this.userService.update(
          id,
          body as Partial<{ name: string; email: string }>
        );
        return this.sendJson(res, 200, user);
      }

      if (userMatch && method === "DELETE") {
        const id = userMatch[1];
        this.userService.delete(id);
        return this.sendJson(res, 204, null);
      }

      // Project routes
      if (pathname === "/projects" && method === "GET") {
        const projects = this.projectService.getAll();
        return this.sendJson(res, 200, projects);
      }

      if (pathname === "/projects" && method === "POST") {
        const body = await this.parseBody(req);
        const project = this.projectService.create(
          body as { name: string; description: string }
        );
        return this.sendJson(res, 201, project);
      }

      const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
      if (projectMatch && method === "GET") {
        const id = projectMatch[1];
        const project = this.projectService.getById(id);
        return this.sendJson(res, 200, project);
      }

      if (projectMatch && method === "PUT") {
        const id = projectMatch[1];
        const body = await this.parseBody(req);
        const project = this.projectService.update(
          id,
          body as Partial<{ name: string; description: string }>
        );
        return this.sendJson(res, 200, project);
      }

      if (projectMatch && method === "DELETE") {
        const id = projectMatch[1];
        this.projectService.delete(id);
        return this.sendJson(res, 204, null);
      }

      const projectMemberMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMemberMatch && method === "POST") {
        const projectId = projectMemberMatch[1];
        const body = (await this.parseBody(req)) as { userId: string };
        const project = this.projectService.addMember(projectId, body.userId);
        return this.sendJson(res, 200, project);
      }

      if (projectMemberMatch && method === "DELETE") {
        const projectId = projectMemberMatch[1];
        const body = (await this.parseBody(req)) as { userId: string };
        const project = this.projectService.removeMember(projectId, body.userId);
        return this.sendJson(res, 200, project);
      }

      // Task routes
      if (pathname === "/tasks" && method === "GET") {
        const projectId = searchParams.get("projectId");
        if (!projectId) {
          return this.sendJson(res, 400, { error: "projectId query parameter required" });
        }
        const tasks = this.taskService.getByProject(projectId);
        return this.sendJson(res, 200, tasks);
      }

      if (pathname === "/tasks" && method === "POST") {
        const body = await this.parseBody(req);
        const task = this.taskService.create(
          body as { title: string; description: string; projectId: string }
        );
        return this.sendJson(res, 201, task);
      }

      const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
      if (taskMatch && method === "GET") {
        const id = taskMatch[1];
        const task = this.taskService.getById(id);
        return this.sendJson(res, 200, task);
      }

      if (taskMatch && method === "PUT") {
        const id = taskMatch[1];
        const body = await this.parseBody(req);
        const task = this.taskService.update(
          id,
          body as Partial<{ title: string; description: string }>
        );
        return this.sendJson(res, 200, task);
      }

      if (taskMatch && method === "DELETE") {
        const id = taskMatch[1];
        this.taskService.delete(id);
        return this.sendJson(res, 204, null);
      }

      const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch && method === "PUT") {
        const taskId = taskStatusMatch[1];
        const body = (await this.parseBody(req)) as { status: string };
        const task = this.taskService.changeStatus(
          taskId,
          body.status as any
        );
        return this.sendJson(res, 200, task);
      }

      const taskAssignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch && method === "PUT") {
        const taskId = taskAssignMatch[1];
        const body = (await this.parseBody(req)) as { assigneeId: string };
        const task = this.taskService.assign(taskId, body.assigneeId);
        return this.sendJson(res, 200, task);
      }

      // Comment routes
      if (pathname === "/comments" && method === "GET") {
        const taskId = searchParams.get("taskId");
        if (!taskId) {
          return this.sendJson(res, 400, { error: "taskId query parameter required" });
        }
        const comments = this.commentService.getByTask(taskId);
        return this.sendJson(res, 200, comments);
      }

      if (pathname === "/comments" && method === "POST") {
        const body = await this.parseBody(req);
        const comment = this.commentService.create(
          body as { taskId: string; authorId: string; body: string }
        );
        return this.sendJson(res, 201, comment);
      }

      const commentMatch = pathname.match(/^\/comments\/([^/]+)$/);
      if (commentMatch && method === "GET") {
        const id = commentMatch[1];
        const comment = this.commentService.getById(id);
        return this.sendJson(res, 200, comment);
      }

      if (commentMatch && method === "DELETE") {
        const id = commentMatch[1];
        this.commentService.delete(id);
        return this.sendJson(res, 204, null);
      }

      // Notification routes
      if (pathname === "/notifications" && method === "GET") {
        const userId = searchParams.get("userId");
        if (!userId) {
          return this.sendJson(res, 400, { error: "userId query parameter required" });
        }
        const notifications = this.notificationService.getByUser(userId);
        return this.sendJson(res, 200, notifications);
      }

      const notificationReadMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
      if (notificationReadMatch && method === "PUT") {
        const notificationId = notificationReadMatch[1];
        const notification = this.notificationService.markAsRead(notificationId);
        return this.sendJson(res, 200, notification);
      }

      // 404
      return this.sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return this.sendJson(res, 500, { error: message });
    }
  }

  private async parseBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk.toString();
      });
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (error) {
          reject(new Error("Invalid JSON in request body"));
        }
      });
      req.on("error", reject);
    });
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    if (statusCode === 204) {
      res.end();
    } else {
      res.end(JSON.stringify(data, null, 2));
    }
  }
}
