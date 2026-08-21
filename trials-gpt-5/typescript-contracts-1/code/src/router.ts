import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { parse as parseUrl } from "node:url";
import { IUserService, IProjectService, ITaskService, ICommentService, INotificationService, TaskStatus } from "./types";

export class Router {
  constructor(
    private userService: IUserService,
    private projectService: IProjectService,
    private taskService: ITaskService,
    private commentService: ICommentService,
    private notificationService: INotificationService,
  ) {}

  private async readBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        if (!data) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Invalid JSON"));
        }
      });
      req.on("error", reject);
    });
  }

  private send(res: ServerResponse, status: number, body: unknown): void {
    const json = JSON.stringify(body);
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Length", Buffer.byteLength(json));
    res.end(json);
  }

  private notFound(res: ServerResponse): void {
    this.send(res, 404, { error: "Not Found" });
  }

  private methodNotAllowed(res: ServerResponse): void {
    this.send(res, 405, { error: "Method Not Allowed" });
  }

  handler = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const parsed = parseUrl(req.url || "", true);
      const pathname = parsed.pathname || "/";
      const method = req.method || "GET";

      // Users
      if (pathname === "/users") {
        if (method === "GET") return this.send(res, 200, this.userService.getAll());
        if (method === "POST") {
          const body = await this.readBody(req);
          return this.send(res, 201, this.userService.create(body));
        }
        return this.methodNotAllowed(res);
      }

      const userMatch = pathname.match(/^\/users\/([^/]+)$/);
      if (userMatch) {
        const id = userMatch[1];
        if (method === "GET") return this.send(res, 200, this.userService.getById(id));
        if (method === "PUT") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.userService.update(id, body));
        }
        if (method === "DELETE") {
          this.userService.delete(id);
          return this.send(res, 204, {});
        }
        return this.methodNotAllowed(res);
      }

      // Projects
      if (pathname === "/projects") {
        if (method === "GET") return this.send(res, 200, this.projectService.getAll());
        if (method === "POST") {
          const body = await this.readBody(req);
          return this.send(res, 201, this.projectService.create(body));
        }
        return this.methodNotAllowed(res);
      }

      const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
      if (projectMatch) {
        const id = projectMatch[1];
        if (method === "GET") return this.send(res, 200, this.projectService.getById(id));
        if (method === "PUT") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.projectService.update(id, body));
        }
        if (method === "DELETE") {
          this.projectService.delete(id);
          return this.send(res, 204, {});
        }
        return this.methodNotAllowed(res);
      }

      const projectMembersMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMembersMatch) {
        const id = projectMembersMatch[1];
        if (method === "POST") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.projectService.addMember(id, body.userId));
        }
        if (method === "DELETE") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.projectService.removeMember(id, body.userId));
        }
        return this.methodNotAllowed(res);
      }

      // Tasks
      if (pathname === "/tasks") {
        if (method === "GET") {
          const projectId = (parsed.query["projectId"] as string) || "";
          return this.send(res, 200, this.taskService.getByProject(projectId));
        }
        if (method === "POST") {
          const body = await this.readBody(req);
          return this.send(res, 201, this.taskService.create(body));
        }
        return this.methodNotAllowed(res);
      }

      const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
      if (taskMatch) {
        const id = taskMatch[1];
        if (method === "GET") return this.send(res, 200, this.taskService.getById(id));
        if (method === "PUT") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.taskService.update(id, body));
        }
        if (method === "DELETE") {
          this.taskService.delete(id);
          return this.send(res, 204, {});
        }
        return this.methodNotAllowed(res);
      }

      const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch) {
        const id = taskStatusMatch[1];
        if (method === "PUT") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.taskService.changeStatus(id, body.status as TaskStatus));
        }
        return this.methodNotAllowed(res);
      }

      const taskAssignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch) {
        const id = taskAssignMatch[1];
        if (method === "PUT") {
          const body = await this.readBody(req);
          return this.send(res, 200, this.taskService.assign(id, body.assigneeId));
        }
        return this.methodNotAllowed(res);
      }

      // Comments
      if (pathname === "/comments") {
        if (method === "GET") {
          const taskId = (parsed.query["taskId"] as string) || "";
          return this.send(res, 200, this.commentService.getByTask(taskId));
        }
        if (method === "POST") {
          const body = await this.readBody(req);
          return this.send(res, 201, this.commentService.create(body));
        }
        return this.methodNotAllowed(res);
      }

      const commentMatch = pathname.match(/^\/comments\/([^/]+)$/);
      if (commentMatch) {
        const id = commentMatch[1];
        if (method === "GET") return this.send(res, 200, this.commentService.getById(id));
        if (method === "DELETE") {
          this.commentService.delete(id);
          return this.send(res, 204, {});
        }
        return this.methodNotAllowed(res);
      }

      // Notifications
      if (pathname === "/notifications") {
        if (method === "GET") {
          const userId = (parsed.query["userId"] as string) || "";
          return this.send(res, 200, this.notificationService.getByUser(userId));
        }
        return this.methodNotAllowed(res);
      }

      const notifMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
      if (notifMatch) {
        const id = notifMatch[1];
        if (method === "PUT") {
          return this.send(res, 200, this.notificationService.markAsRead(id));
        }
        return this.methodNotAllowed(res);
      }

      return this.notFound(res);
    } catch (err: any) {
      const message = err?.message || "Internal Server Error";
      this.send(res, 400, { error: message });
    }
  };
}

export function createHttpServer(router: Router) {
  return createServer(router.handler);
}
