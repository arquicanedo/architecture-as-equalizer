// ============================================================
// HTTP Router
// ============================================================

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { IUserService } from "./services/user-service.js";
import { IProjectService } from "./services/project-service.js";
import { ITaskService, TaskStatus } from "./services/task-service.js";
import { ICommentService } from "./services/comment-service.js";
import { INotificationService } from "./services/notification-service.js";

interface RouterConfig {
  userService: IUserService;
  projectService: IProjectService;
  taskService: ITaskService;
  commentService: ICommentService;
  notificationService: INotificationService;
}

export class Router {
  constructor(private config: RouterConfig) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method || "GET";
    const searchParams = url.searchParams;

    try {
      // Users
      if (pathname === "/users" && method === "GET") {
        return this.sendJSON(res, 200, this.config.userService.getAll());
      }
      if (pathname === "/users" && method === "POST") {
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const user = this.config.userService.create({
          name: body.name as string,
          email: body.email as string,
        });
        return this.sendJSON(res, 201, user);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const user = this.config.userService.getById(id);
        return this.sendJSON(res, 200, user);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const user = this.config.userService.update(id, {
          name: body.name as string | undefined,
          email: body.email as string | undefined,
        });
        return this.sendJSON(res, 200, user);
      }
      if (pathname.match(/^\/users\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.config.userService.delete(id);
        return this.sendJSON(res, 204, null);
      }

      // Projects
      if (pathname === "/projects" && method === "GET") {
        return this.sendJSON(res, 200, this.config.projectService.getAll());
      }
      if (pathname === "/projects" && method === "POST") {
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const project = this.config.projectService.create({
          name: body.name as string,
          description: body.description as string,
        });
        return this.sendJSON(res, 201, project);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const project = this.config.projectService.getById(id);
        return this.sendJSON(res, 200, project);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const project = this.config.projectService.update(id, {
          name: body.name as string | undefined,
          description: body.description as string | undefined,
        });
        return this.sendJSON(res, 200, project);
      }
      if (pathname.match(/^\/projects\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.config.projectService.delete(id);
        return this.sendJSON(res, 204, null);
      }
      if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === "POST") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const project = this.config.projectService.addMember(
          id,
          body.userId as string
        );
        return this.sendJSON(res, 200, project);
      }
      if (pathname.match(/^\/projects\/[^/]+\/members$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const project = this.config.projectService.removeMember(
          id,
          body.userId as string
        );
        return this.sendJSON(res, 200, project);
      }

      // Tasks
      if (pathname === "/tasks" && method === "GET") {
        const projectId = searchParams.get("projectId");
        if (projectId) {
          const tasks = this.config.taskService.getByProject(projectId);
          return this.sendJSON(res, 200, tasks);
        }
        return this.sendJSON(res, 400, { error: "projectId query parameter required" });
      }
      if (pathname === "/tasks" && method === "POST") {
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const task = this.config.taskService.create({
          title: body.title as string,
          description: body.description as string,
          projectId: body.projectId as string,
        });
        return this.sendJSON(res, 201, task);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const task = this.config.taskService.getById(id);
        return this.sendJSON(res, 200, task);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const task = this.config.taskService.update(id, {
          title: body.title as string | undefined,
          description: body.description as string | undefined,
        });
        return this.sendJSON(res, 200, task);
      }
      if (pathname.match(/^\/tasks\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.config.taskService.delete(id);
        return this.sendJSON(res, 204, null);
      }
      if (pathname.match(/^\/tasks\/[^/]+\/status$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const task = this.config.taskService.changeStatus(
          id,
          body.status as TaskStatus
        );
        return this.sendJSON(res, 200, task);
      }
      if (pathname.match(/^\/tasks\/[^/]+\/assign$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const task = this.config.taskService.assign(id, body.assigneeId as string);
        return this.sendJSON(res, 200, task);
      }

      // Comments
      if (pathname === "/comments" && method === "GET") {
        const taskId = searchParams.get("taskId");
        if (taskId) {
          const comments = this.config.commentService.getByTask(taskId);
          return this.sendJSON(res, 200, comments);
        }
        return this.sendJSON(res, 400, { error: "taskId query parameter required" });
      }
      if (pathname === "/comments" && method === "POST") {
        const body = (await this.parseJSON(req)) as Record<string, unknown>;
        const comment = this.config.commentService.create({
          taskId: body.taskId as string,
          authorId: body.authorId as string,
          body: body.body as string,
        });
        return this.sendJSON(res, 201, comment);
      }
      if (pathname.match(/^\/comments\/[^/]+$/) && method === "GET") {
        const id = pathname.split("/")[2];
        const comment = this.config.commentService.getById(id);
        return this.sendJSON(res, 200, comment);
      }
      if (pathname.match(/^\/comments\/[^/]+$/) && method === "DELETE") {
        const id = pathname.split("/")[2];
        this.config.commentService.delete(id);
        return this.sendJSON(res, 204, null);
      }

      // Notifications
      if (pathname === "/notifications" && method === "GET") {
        const userId = searchParams.get("userId");
        if (userId) {
          const notifications = this.config.notificationService.getByUser(userId);
          return this.sendJSON(res, 200, notifications);
        }
        return this.sendJSON(res, 400, { error: "userId query parameter required" });
      }
      if (pathname.match(/^\/notifications\/[^/]+\/read$/) && method === "PUT") {
        const id = pathname.split("/")[2];
        const notification = this.config.notificationService.markAsRead(id);
        return this.sendJSON(res, 200, notification);
      }

      // 404
      return this.sendJSON(res, 404, { error: "Not found" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return this.sendJSON(res, 400, { error: message });
    }
  }

  private async parseJSON(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          resolve(JSON.parse(data || "{}"));
        } catch (error) {
          reject(error);
        }
      });
      req.on("error", reject);
    });
  }

  private sendJSON(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    if (status === 204) {
      res.end();
    } else {
      res.end(JSON.stringify(data));
    }
  }
}
