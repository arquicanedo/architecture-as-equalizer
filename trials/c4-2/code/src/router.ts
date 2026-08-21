/**
 * API Router — single HTTP entry point.
 * Parses requests, delegates to services, returns JSON responses.
 * No business logic lives here; all logic is in the services.
 */

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService, TaskStatus } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (!raw.trim()) {
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

function send(
  res: ServerResponse,
  status: number,
  body: unknown
): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function ok(res: ServerResponse, body: unknown): void {
  send(res, 200, body);
}

function created(res: ServerResponse, body: unknown): void {
  send(res, 201, body);
}

function notFound(res: ServerResponse, message = "Not found"): void {
  send(res, 404, { error: message });
}

function badRequest(res: ServerResponse, message: string): void {
  send(res, 400, { error: message });
}

function serverError(res: ServerResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  send(res, 500, { error: message });
}

/**
 * Extract path segments from the URL, ignoring empty strings.
 * e.g. "/tasks/abc/status" → ["tasks", "abc", "status"]
 */
function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

// ── Router class ─────────────────────────────────────────────────────────────

export class Router {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly commentService: CommentService,
    private readonly notificationService: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Build a full URL so we can use the WHATWG URL API for query params
    const base = `http://localhost`;
    const fullUrl = new URL(req.url ?? "/", base);
    const pathname = fullUrl.pathname;
    const segs = segments(pathname);
    const method = (req.method ?? "GET").toUpperCase();

    try {
      // ── /users ────────────────────────────────────────────────────────────
      if (segs[0] === "users") {
        await this.handleUsers(method, segs, fullUrl, req, res);

      // ── /projects ─────────────────────────────────────────────────────────
      } else if (segs[0] === "projects") {
        await this.handleProjects(method, segs, fullUrl, req, res);

      // ── /tasks ────────────────────────────────────────────────────────────
      } else if (segs[0] === "tasks") {
        await this.handleTasks(method, segs, fullUrl, req, res);

      // ── /comments ─────────────────────────────────────────────────────────
      } else if (segs[0] === "comments") {
        await this.handleComments(method, segs, fullUrl, req, res);

      // ── /notifications ────────────────────────────────────────────────────
      } else if (segs[0] === "notifications") {
        await this.handleNotifications(method, segs, fullUrl, req, res);

      } else {
        notFound(res, `No route matched: ${method} ${pathname}`);
      }
    } catch (err) {
      serverError(res, err);
    }
  }

  // ── User handlers ──────────────────────────────────────────────────────────

  private async handleUsers(
    method: string,
    segs: string[],
    _url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // GET /users
    if (method === "GET" && segs.length === 1) {
      return ok(res, this.userService.getAll());
    }

    // POST /users
    if (method === "POST" && segs.length === 1) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const user = this.userService.create({
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
      });
      return created(res, user);
    }

    // GET /users/:id
    if (method === "GET" && segs.length === 2) {
      const user = this.userService.getById(segs[1]);
      return ok(res, user);
    }

    // PUT /users/:id
    if (method === "PUT" && segs.length === 2) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const user = this.userService.update(segs[1], {
        name: body.name !== undefined ? String(body.name) : undefined,
        email: body.email !== undefined ? String(body.email) : undefined,
      });
      return ok(res, user);
    }

    // DELETE /users/:id
    if (method === "DELETE" && segs.length === 2) {
      this.userService.delete(segs[1]);
      return ok(res, { deleted: true });
    }

    notFound(res);
  }

  // ── Project handlers ───────────────────────────────────────────────────────

  private async handleProjects(
    method: string,
    segs: string[],
    _url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // GET /projects
    if (method === "GET" && segs.length === 1) {
      return ok(res, this.projectService.getAll());
    }

    // POST /projects
    if (method === "POST" && segs.length === 1) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const project = this.projectService.create({
        name: String(body.name ?? ""),
        description: String(body.description ?? ""),
      });
      return created(res, project);
    }

    // GET /projects/:id
    if (method === "GET" && segs.length === 2) {
      return ok(res, this.projectService.getById(segs[1]));
    }

    // PUT /projects/:id
    if (method === "PUT" && segs.length === 2) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const project = this.projectService.update(segs[1], {
        name: body.name !== undefined ? String(body.name) : undefined,
        description:
          body.description !== undefined ? String(body.description) : undefined,
      });
      return ok(res, project);
    }

    // DELETE /projects/:id
    if (method === "DELETE" && segs.length === 2) {
      this.projectService.delete(segs[1]);
      return ok(res, { deleted: true });
    }

    // POST /projects/:id/members  { userId }
    if (method === "POST" && segs.length === 3 && segs[2] === "members") {
      const body = (await readBody(req)) as Record<string, unknown>;
      const userId = String(body.userId ?? "");
      if (!userId) return badRequest(res, "userId is required");
      const project = this.projectService.addMember(segs[1], userId);
      return ok(res, project);
    }

    // DELETE /projects/:id/members  { userId }
    if (method === "DELETE" && segs.length === 3 && segs[2] === "members") {
      const body = (await readBody(req)) as Record<string, unknown>;
      const userId = String(body.userId ?? "");
      if (!userId) return badRequest(res, "userId is required");
      const project = this.projectService.removeMember(segs[1], userId);
      return ok(res, project);
    }

    notFound(res);
  }

  // ── Task handlers ──────────────────────────────────────────────────────────

  private async handleTasks(
    method: string,
    segs: string[],
    url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // GET /tasks?projectId=X
    if (method === "GET" && segs.length === 1) {
      const projectId = url.searchParams.get("projectId");
      if (!projectId) return badRequest(res, "projectId query param is required");
      return ok(res, this.taskService.getByProject(projectId));
    }

    // POST /tasks
    if (method === "POST" && segs.length === 1) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const task = this.taskService.create({
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        projectId: String(body.projectId ?? ""),
      });
      return created(res, task);
    }

    // GET /tasks/:id
    if (method === "GET" && segs.length === 2) {
      return ok(res, this.taskService.getById(segs[1]));
    }

    // PUT /tasks/:id
    if (method === "PUT" && segs.length === 2) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const task = this.taskService.update(segs[1], {
        title: body.title !== undefined ? String(body.title) : undefined,
        description:
          body.description !== undefined ? String(body.description) : undefined,
      });
      return ok(res, task);
    }

    // DELETE /tasks/:id
    if (method === "DELETE" && segs.length === 2) {
      this.taskService.delete(segs[1]);
      return ok(res, { deleted: true });
    }

    // PUT /tasks/:id/status  { status }
    if (method === "PUT" && segs.length === 3 && segs[2] === "status") {
      const body = (await readBody(req)) as Record<string, unknown>;
      const newStatus = String(body.status ?? "") as TaskStatus;
      const task = this.taskService.changeStatus(segs[1], newStatus);
      return ok(res, task);
    }

    // PUT /tasks/:id/assign  { assigneeId }
    if (method === "PUT" && segs.length === 3 && segs[2] === "assign") {
      const body = (await readBody(req)) as Record<string, unknown>;
      const assigneeId = String(body.assigneeId ?? "");
      if (!assigneeId) return badRequest(res, "assigneeId is required");
      const task = this.taskService.assign(segs[1], assigneeId);
      return ok(res, task);
    }

    notFound(res);
  }

  // ── Comment handlers ───────────────────────────────────────────────────────

  private async handleComments(
    method: string,
    segs: string[],
    url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // GET /comments?taskId=X
    if (method === "GET" && segs.length === 1) {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) return badRequest(res, "taskId query param is required");
      return ok(res, this.commentService.getByTask(taskId));
    }

    // POST /comments  { taskId, authorId, body }
    // Router resolves task and user details before calling the service.
    if (method === "POST" && segs.length === 1) {
      const body = (await readBody(req)) as Record<string, unknown>;
      const taskId = String(body.taskId ?? "");
      const authorId = String(body.authorId ?? "");
      const commentBody = String(body.body ?? "");

      if (!taskId) return badRequest(res, "taskId is required");
      if (!authorId) return badRequest(res, "authorId is required");
      if (!commentBody) return badRequest(res, "body is required");

      // Resolve task and user details (router is allowed to read from services)
      const task = this.taskService.getById(taskId);
      const author = this.userService.getById(authorId);

      const comment = this.commentService.create({
        taskId,
        authorId,
        body: commentBody,
        taskTitle: task.title,
        authorName: author.name,
        taskAssigneeId: task.assigneeId,
      });
      return created(res, comment);
    }

    // GET /comments/:id
    if (method === "GET" && segs.length === 2) {
      return ok(res, this.commentService.getById(segs[1]));
    }

    // DELETE /comments/:id
    if (method === "DELETE" && segs.length === 2) {
      this.commentService.delete(segs[1]);
      return ok(res, { deleted: true });
    }

    notFound(res);
  }

  // ── Notification handlers ──────────────────────────────────────────────────

  private async handleNotifications(
    method: string,
    segs: string[],
    url: URL,
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // GET /notifications?userId=X
    if (method === "GET" && segs.length === 1) {
      const userId = url.searchParams.get("userId");
      if (!userId) return badRequest(res, "userId query param is required");
      return ok(res, this.notificationService.getByUser(userId));
    }

    // PUT /notifications/:id/read
    if (method === "PUT" && segs.length === 3 && segs[2] === "read") {
      const notification = this.notificationService.markAsRead(segs[1]);
      return ok(res, notification);
    }

    notFound(res);
  }
}
