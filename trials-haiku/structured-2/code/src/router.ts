/**
 * API Router - HTTP request handler using Node.js built-in http module
 * Routes all requests to appropriate services
 */

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";

export class Router {
  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private commentService: CommentService,
    private notificationService: NotificationService
  ) {}

  /**
   * Main request handler
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method || "GET";

    try {
      // Parse body for POST/PUT requests
      let body: any = {};
      if (method === "POST" || method === "PUT") {
        body = await this.parseBody(req);
      }

      // Route requests
      if (pathname === "/users" && method === "GET") {
        return this.sendJson(res, 200, this.userService.getAll());
      }

      if (pathname === "/users" && method === "POST") {
        const user = this.userService.create(body.name, body.email);
        return this.sendJson(res, 201, user);
      }

      const userIdMatch = pathname.match(/^\/users\/([^/]+)$/);
      if (userIdMatch && method === "GET") {
        const user = this.userService.getById(userIdMatch[1]);
        if (!user) return this.sendJson(res, 404, { error: "User not found" });
        return this.sendJson(res, 200, user);
      }

      if (userIdMatch && method === "PUT") {
        const user = this.userService.update(userIdMatch[1], body);
        if (!user) return this.sendJson(res, 404, { error: "User not found" });
        return this.sendJson(res, 200, user);
      }

      if (userIdMatch && method === "DELETE") {
        const deleted = this.userService.delete(userIdMatch[1]);
        if (!deleted) return this.sendJson(res, 404, { error: "User not found" });
        return this.sendJson(res, 204, null);
      }

      // Projects routes
      if (pathname === "/projects" && method === "GET") {
        return this.sendJson(res, 200, this.projectService.getAll());
      }

      if (pathname === "/projects" && method === "POST") {
        const project = this.projectService.create(body.name, body.description);
        return this.sendJson(res, 201, project);
      }

      const projectIdMatch = pathname.match(/^\/projects\/([^/]+)$/);
      if (projectIdMatch && method === "GET") {
        const project = this.projectService.getById(projectIdMatch[1]);
        if (!project)
          return this.sendJson(res, 404, { error: "Project not found" });
        return this.sendJson(res, 200, project);
      }

      if (projectIdMatch && method === "PUT") {
        const project = this.projectService.update(projectIdMatch[1], body);
        if (!project)
          return this.sendJson(res, 404, { error: "Project not found" });
        return this.sendJson(res, 200, project);
      }

      if (projectIdMatch && method === "DELETE") {
        const deleted = this.projectService.delete(projectIdMatch[1]);
        if (!deleted)
          return this.sendJson(res, 404, { error: "Project not found" });
        return this.sendJson(res, 204, null);
      }

      // Project members routes
      const projectMembersMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMembersMatch && method === "POST") {
        const project = this.projectService.addMember(
          projectMembersMatch[1],
          body.userId
        );
        if (!project)
          return this.sendJson(res, 404, { error: "Project not found" });
        return this.sendJson(res, 200, project);
      }

      if (projectMembersMatch && method === "DELETE") {
        const project = this.projectService.removeMember(
          projectMembersMatch[1],
          body.userId
        );
        if (!project)
          return this.sendJson(res, 404, { error: "Project not found" });
        return this.sendJson(res, 200, project);
      }

      // Tasks routes
      if (pathname === "/tasks" && method === "GET") {
        const projectId = url.searchParams.get("projectId");
        if (projectId) {
          return this.sendJson(res, 200, this.taskService.getByProject(projectId));
        }
        return this.sendJson(res, 200, this.taskService.getAll());
      }

      if (pathname === "/tasks" && method === "POST") {
        const task = this.taskService.create(
          body.title,
          body.description,
          body.projectId
        );
        return this.sendJson(res, 201, task);
      }

      const taskIdMatch = pathname.match(/^\/tasks\/([^/]+)$/);
      if (taskIdMatch && method === "GET") {
        const task = this.taskService.getById(taskIdMatch[1]);
        if (!task) return this.sendJson(res, 404, { error: "Task not found" });
        return this.sendJson(res, 200, task);
      }

      if (taskIdMatch && method === "PUT") {
        const task = this.taskService.update(taskIdMatch[1], body);
        if (!task) return this.sendJson(res, 404, { error: "Task not found" });
        return this.sendJson(res, 200, task);
      }

      if (taskIdMatch && method === "DELETE") {
        const deleted = this.taskService.delete(taskIdMatch[1]);
        if (!deleted) return this.sendJson(res, 404, { error: "Task not found" });
        return this.sendJson(res, 204, null);
      }

      // Task status change
      const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch && method === "PUT") {
        const task = this.taskService.changeStatus(taskStatusMatch[1], body.status);
        if (!task) return this.sendJson(res, 404, { error: "Task not found" });
        return this.sendJson(res, 200, task);
      }

      // Task assignment
      const taskAssignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch && method === "PUT") {
        const task = this.taskService.assign(taskAssignMatch[1], body.assigneeId);
        if (!task) return this.sendJson(res, 404, { error: "Task not found" });
        return this.sendJson(res, 200, task);
      }

      // Comments routes
      if (pathname === "/comments" && method === "GET") {
        const taskId = url.searchParams.get("taskId");
        if (taskId) {
          return this.sendJson(res, 200, this.commentService.getByTask(taskId));
        }
        return this.sendJson(res, 400, { error: "taskId parameter required" });
      }

      if (pathname === "/comments" && method === "POST") {
        const comment = this.commentService.create(
          body.taskId,
          body.authorId,
          body.authorName,
          body.body,
          body.taskTitle
        );
        return this.sendJson(res, 201, comment);
      }

      const commentIdMatch = pathname.match(/^\/comments\/([^/]+)$/);
      if (commentIdMatch && method === "GET") {
        const comment = this.commentService.getById(commentIdMatch[1]);
        if (!comment)
          return this.sendJson(res, 404, { error: "Comment not found" });
        return this.sendJson(res, 200, comment);
      }

      if (commentIdMatch && method === "DELETE") {
        const deleted = this.commentService.delete(commentIdMatch[1]);
        if (!deleted)
          return this.sendJson(res, 404, { error: "Comment not found" });
        return this.sendJson(res, 204, null);
      }

      // Notifications routes
      if (pathname === "/notifications" && method === "GET") {
        const userId = url.searchParams.get("userId");
        if (!userId) {
          return this.sendJson(res, 400, { error: "userId parameter required" });
        }
        return this.sendJson(res, 200, this.notificationService.getByUser(userId));
      }

      const notifReadMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
      if (notifReadMatch && method === "PUT") {
        const notif = this.notificationService.markAsRead(notifReadMatch[1]);
        if (!notif)
          return this.sendJson(res, 404, { error: "Notification not found" });
        return this.sendJson(res, 200, notif);
      }

      // 404 Not Found
      return this.sendJson(res, 404, { error: "Route not found" });
    } catch (error) {
      console.error("Router error:", error);
      return this.sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  /**
   * Parse JSON body from request
   */
  private parseBody(req: IncomingMessage): Promise<any> {
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

  /**
   * Send JSON response
   */
  private sendJson(
    res: ServerResponse,
    statusCode: number,
    data: any
  ): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    if (statusCode === 204) {
      res.end();
    } else {
      res.end(JSON.stringify(data, null, 2));
    }
  }
}
