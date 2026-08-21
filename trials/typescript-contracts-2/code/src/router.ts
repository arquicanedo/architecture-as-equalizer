import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  IUserService,
  IProjectService,
  ITaskService,
  ICommentService,
  INotificationService,
  TaskStatus,
} from "./types.js";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

// ---------------------------------------------------------------
// Router
// ---------------------------------------------------------------

export class Router {
  private userService: IUserService;
  private projectService: IProjectService;
  private taskService: ITaskService;
  private commentService: ICommentService;
  private notificationService: INotificationService;

  constructor(
    userService: IUserService,
    projectService: IProjectService,
    taskService: ITaskService,
    commentService: ICommentService,
    notificationService: INotificationService
  ) {
    this.userService = userService;
    this.projectService = projectService;
    this.taskService = taskService;
    this.commentService = commentService;
    this.notificationService = notificationService;
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const baseUrl = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", baseUrl);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    const method = req.method ?? "GET";

    try {
      // ── Users ────────────────────────────────────────────────
      if (pathname === "/users" && method === "GET") {
        return sendJson(res, 200, this.userService.getAll());
      }

      if (pathname === "/users" && method === "POST") {
        const body = await readBody(req) as { name: string; email: string };
        return sendJson(res, 201, this.userService.create(body));
      }

      const userMatch = pathname.match(/^\/users\/([^/]+)$/);
      if (userMatch) {
        const id = userMatch[1];
        if (method === "GET") {
          return sendJson(res, 200, this.userService.getById(id));
        }
        if (method === "PUT") {
          const body = await readBody(req) as Partial<{ name: string; email: string }>;
          return sendJson(res, 200, this.userService.update(id, body));
        }
        if (method === "DELETE") {
          this.userService.delete(id);
          return sendJson(res, 204, null);
        }
      }

      // ── Projects ─────────────────────────────────────────────
      if (pathname === "/projects" && method === "GET") {
        return sendJson(res, 200, this.projectService.getAll());
      }

      if (pathname === "/projects" && method === "POST") {
        const body = await readBody(req) as { name: string; description: string };
        return sendJson(res, 201, this.projectService.create(body));
      }

      const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
      if (projectMatch) {
        const id = projectMatch[1];
        if (method === "GET") {
          return sendJson(res, 200, this.projectService.getById(id));
        }
        if (method === "PUT") {
          const body = await readBody(req) as Partial<{ name: string; description: string }>;
          return sendJson(res, 200, this.projectService.update(id, body));
        }
        if (method === "DELETE") {
          this.projectService.delete(id);
          return sendJson(res, 204, null);
        }
      }

      const projectMembersMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
      if (projectMembersMatch) {
        const id = projectMembersMatch[1];
        if (method === "POST") {
          const body = await readBody(req) as { userId: string };
          return sendJson(res, 200, this.projectService.addMember(id, body.userId));
        }
        if (method === "DELETE") {
          const body = await readBody(req) as { userId: string };
          return sendJson(res, 200, this.projectService.removeMember(id, body.userId));
        }
      }

      // ── Tasks ────────────────────────────────────────────────
      if (pathname === "/tasks" && method === "GET") {
        const projectId = url.searchParams.get("projectId");
        if (projectId) {
          return sendJson(res, 200, this.taskService.getByProject(projectId));
        }
        return sendError(res, 400, "Missing required query parameter: projectId");
      }

      if (pathname === "/tasks" && method === "POST") {
        const body = await readBody(req) as { title: string; description: string; projectId: string };
        return sendJson(res, 201, this.taskService.create(body));
      }

      const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch) {
        const id = taskStatusMatch[1];
        if (method === "PUT") {
          const body = await readBody(req) as { status: TaskStatus };
          return sendJson(res, 200, this.taskService.changeStatus(id, body.status));
        }
      }

      const taskAssignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
      if (taskAssignMatch) {
        const id = taskAssignMatch[1];
        if (method === "PUT") {
          const body = await readBody(req) as { assigneeId: string };
          return sendJson(res, 200, this.taskService.assign(id, body.assigneeId));
        }
      }

      const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
      if (taskMatch) {
        const id = taskMatch[1];
        if (method === "GET") {
          return sendJson(res, 200, this.taskService.getById(id));
        }
        if (method === "PUT") {
          const body = await readBody(req) as Partial<{ title: string; description: string }>;
          return sendJson(res, 200, this.taskService.update(id, body));
        }
        if (method === "DELETE") {
          this.taskService.delete(id);
          return sendJson(res, 204, null);
        }
      }

      // ── Comments ─────────────────────────────────────────────
      if (pathname === "/comments" && method === "GET") {
        const taskId = url.searchParams.get("taskId");
        if (taskId) {
          return sendJson(res, 200, this.commentService.getByTask(taskId));
        }
        return sendError(res, 400, "Missing required query parameter: taskId");
      }

      if (pathname === "/comments" && method === "POST") {
        const body = await readBody(req) as { taskId: string; authorId: string; body: string };
        return sendJson(res, 201, this.commentService.create(body));
      }

      const commentMatch = pathname.match(/^\/comments\/([^/]+)$/);
      if (commentMatch) {
        const id = commentMatch[1];
        if (method === "GET") {
          return sendJson(res, 200, this.commentService.getById(id));
        }
        if (method === "DELETE") {
          this.commentService.delete(id);
          return sendJson(res, 204, null);
        }
      }

      // ── Notifications ────────────────────────────────────────
      if (pathname === "/notifications" && method === "GET") {
        const userId = url.searchParams.get("userId");
        if (userId) {
          return sendJson(res, 200, this.notificationService.getByUser(userId));
        }
        return sendError(res, 400, "Missing required query parameter: userId");
      }

      const notificationReadMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
      if (notificationReadMatch) {
        const id = notificationReadMatch[1];
        if (method === "PUT") {
          return sendJson(res, 200, this.notificationService.markAsRead(id));
        }
      }

      // ── 404 ──────────────────────────────────────────────────
      return sendError(res, 404, `Route not found: ${method} ${pathname}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      // Use 404 for "not found" errors, 400 for validation errors, 500 otherwise
      if (message.toLowerCase().includes("not found")) {
        return sendError(res, 404, message);
      }
      if (
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("transition")
      ) {
        return sendError(res, 400, message);
      }
      console.error("[Router] Unexpected error:", err);
      return sendError(res, 500, message);
    }
  }
}
