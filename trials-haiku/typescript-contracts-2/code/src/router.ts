// ============================================================
// API Router — HTTP Request Handling
// ============================================================

import * as http from "http";
import * as url from "url";
import { IUserService } from "./services/user-service.js";
import { IProjectService } from "./services/project-service.js";
import { ITaskService } from "./services/task-service.js";
import { ICommentService } from "./services/comment-service.js";
import { INotificationService } from "./services/notification-service.js";

interface RouterDependencies {
  userService: IUserService;
  projectService: IProjectService;
  taskService: ITaskService;
  commentService: ICommentService;
  notificationService: INotificationService;
  commentServicePublish?: (commentId: string, taskId: string, taskTitle: string, authorId: string, authorName: string) => void;
  userServiceGetById?: (id: string) => { name: string };
  taskServiceGetById?: (id: string) => { title: string; assigneeId: string | null };
}

class Router {
  private dependencies: RouterDependencies;

  constructor(dependencies: RouterDependencies) {
    this.dependencies = dependencies;
  }

  async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname || "";
    const method = req.method || "GET";
    const query = parsedUrl.query;

    res.setHeader("Content-Type", "application/json");

    try {
      // Parse body
      let body: unknown = null;
      if (method === "POST" || method === "PUT") {
        body = await this.parseBody(req);
      }

      // Route handling
      if (pathname === "/users" && method === "GET") {
        const users = this.dependencies.userService.getAll();
        this.sendJson(res, 200, users);
      } else if (pathname === "/users" && method === "POST") {
        const input = body as { name: string; email: string };
        const user = this.dependencies.userService.create(input);
        this.sendJson(res, 201, user);
      } else if (pathname.match(/^\/users\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const user = this.dependencies.userService.getById(id);
        this.sendJson(res, 200, user);
      } else if (pathname.match(/^\/users\/[^/]+$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const input = body as Partial<{ name: string; email: string }>;
        const user = this.dependencies.userService.update(id, input);
        this.sendJson(res, 200, user);
      } else if (pathname.match(/^\/users\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.dependencies.userService.delete(id);
        this.sendJson(res, 204, null);
      } else if (pathname === "/projects" && method === "GET") {
        const projects = this.dependencies.projectService.getAll();
        this.sendJson(res, 200, projects);
      } else if (pathname === "/projects" && method === "POST") {
        const input = body as { name: string; description: string };
        const project = this.dependencies.projectService.create(input);
        this.sendJson(res, 201, project);
      } else if (pathname.match(/^\/projects\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const project = this.dependencies.projectService.getById(id);
        this.sendJson(res, 200, project);
      } else if (pathname.match(/^\/projects\/[^/]+$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const input = body as Partial<{ name: string; description: string }>;
        const project = this.dependencies.projectService.update(id, input);
        this.sendJson(res, 200, project);
      } else if (pathname.match(/^\/projects\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.dependencies.projectService.delete(id);
        this.sendJson(res, 204, null);
      } else if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === "POST") {
        const id = pathname.split("/")[2];
        const input = body as { userId: string };
        const project = this.dependencies.projectService.addMember(id, input.userId);
        this.sendJson(res, 200, project);
      } else if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        const input = body as { userId: string };
        const project = this.dependencies.projectService.removeMember(id, input.userId);
        this.sendJson(res, 200, project);
      } else if (pathname === "/tasks" && method === "GET") {
        const projectId = query.projectId as string;
        if (projectId) {
          const tasks = this.dependencies.taskService.getByProject(projectId);
          this.sendJson(res, 200, tasks);
        } else {
          this.sendJson(res, 400, { error: "projectId query parameter required" });
        }
      } else if (pathname === "/tasks" && method === "POST") {
        const input = body as { title: string; description: string; projectId: string };
        const task = this.dependencies.taskService.create(input);
        this.sendJson(res, 201, task);
      } else if (pathname.match(/^\/tasks\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const task = this.dependencies.taskService.getById(id);
        this.sendJson(res, 200, task);
      } else if (pathname.match(/^\/tasks\/[^/]+$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const input = body as Partial<{ title: string; description: string }>;
        const task = this.dependencies.taskService.update(id, input);
        this.sendJson(res, 200, task);
      } else if (pathname.match(/^\/tasks\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.dependencies.taskService.delete(id);
        this.sendJson(res, 204, null);
      } else if (pathname.match(/^\/tasks\/[^/]+\/status$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const input = body as { status: string };
        const task = this.dependencies.taskService.changeStatus(id, input.status as any);
        this.sendJson(res, 200, task);
      } else if (pathname.match(/^\/tasks\/[^/]+\/assign$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const input = body as { assigneeId: string };
        const task = this.dependencies.taskService.assign(id, input.assigneeId);
        this.sendJson(res, 200, task);
      } else if (pathname === "/comments" && method === "GET") {
        const taskId = query.taskId as string;
        if (taskId) {
          const comments = this.dependencies.commentService.getByTask(taskId);
          this.sendJson(res, 200, comments);
        } else {
          this.sendJson(res, 400, { error: "taskId query parameter required" });
        }
      } else if (pathname === "/comments" && method === "POST") {
        const input = body as { taskId: string; authorId: string; body: string };
        const comment = this.dependencies.commentService.create(input);
        
        // Publish comment.added event if callback is provided
        if (this.dependencies.commentServicePublish && this.dependencies.userServiceGetById && this.dependencies.taskServiceGetById) {
          try {
            const author = this.dependencies.userServiceGetById(input.authorId);
            const task = this.dependencies.taskServiceGetById(input.taskId);
            this.dependencies.commentServicePublish(
              comment.id,
              input.taskId,
              task.title,
              input.authorId,
              author.name
            );
          } catch (e) {
            // Silently ignore if author or task not found
          }
        }
        
        this.sendJson(res, 201, comment);
      } else if (pathname.match(/^\/comments\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const comment = this.dependencies.commentService.getById(id);
        this.sendJson(res, 200, comment);
      } else if (pathname.match(/^\/comments\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.dependencies.commentService.delete(id);
        this.sendJson(res, 204, null);
      } else if (pathname === "/notifications" && method === "GET") {
        const userId = query.userId as string;
        if (userId) {
          const notifications = this.dependencies.notificationService.getByUser(userId);
          this.sendJson(res, 200, notifications);
        } else {
          this.sendJson(res, 400, { error: "userId query parameter required" });
        }
      } else if (pathname.match(/^\/notifications\/[^/]+\/read$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const notification = this.dependencies.notificationService.markAsRead(id);
        this.sendJson(res, 200, notification);
      } else {
        this.sendJson(res, 404, { error: "Not found" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      this.sendJson(res, 500, { error: message });
    }
  }

  private parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (error) {
          reject(new Error("Invalid JSON in request body"));
        }
      });
      req.on("error", reject);
    });
  }

  private sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
    res.statusCode = statusCode;
    if (statusCode === 204) {
      res.end();
    } else {
      res.end(JSON.stringify(data));
    }
  }
}

export { Router };
