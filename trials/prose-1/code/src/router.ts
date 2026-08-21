/**
 * ApiRouter — the single HTTP entry point for the application.
 *
 * Parses incoming requests, routes them to the correct service
 * method, and serialises the response as JSON.  It is the ONLY
 * component that calls service methods directly.  Services never
 * handle HTTP themselves.
 *
 * Route summary
 * ─────────────
 * Users
 *   GET    /users
 *   POST   /users
 *   GET    /users/:id
 *   PUT    /users/:id
 *   DELETE /users/:id
 *
 * Projects
 *   GET    /projects
 *   POST   /projects
 *   GET    /projects/:id
 *   PUT    /projects/:id
 *   DELETE /projects/:id
 *   POST   /projects/:id/members        body: { userId }
 *   DELETE /projects/:id/members/:uid
 *
 * Tasks
 *   GET    /tasks[?projectId=…]
 *   POST   /tasks
 *   GET    /tasks/:id
 *   PUT    /tasks/:id
 *   DELETE /tasks/:id
 *   PUT    /tasks/:id/status            body: { status }
 *   PUT    /tasks/:id/assign            body: { userId }
 *
 * Comments
 *   GET    /comments[?taskId=…]
 *   POST   /comments
 *   GET    /comments/:id
 *   DELETE /comments/:id
 *
 * Notifications
 *   GET    /notifications[?userId=…]
 *   PUT    /notifications/:id/read
 */

import type { IncomingMessage, ServerResponse } from "http";
import type { UserService } from "./services/user-service.js";
import type { ProjectService } from "./services/project-service.js";
import type { TaskService } from "./services/task-service.js";
import type { CommentService } from "./services/comment-service.js";
import type { NotificationService } from "./services/notification-service.js";
import type { TaskStatus } from "./types.js";

// ── Tiny URL helpers (no external deps) ──────────────────────────────────────

/** Split a path into clean, non-empty segments. */
function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Parse the query string from a URL into a plain record. */
function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const qs = url.slice(idx + 1);
  const result: Record<string, string> = {};
  for (const part of qs.split("&")) {
    const [k, v] = part.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return result;
}

// ── Body reader ───────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body is not valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

// ── Response helpers ──────────────────────────────────────────────────────────

function send(res: ServerResponse, statusCode: number, body: unknown): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
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

function noContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

function badRequest(res: ServerResponse, message: string): void {
  send(res, 400, { error: message });
}

function notFound(res: ServerResponse, message = "Not found."): void {
  send(res, 404, { error: message });
}

function methodNotAllowed(res: ServerResponse): void {
  send(res, 405, { error: "Method not allowed." });
}

function serverError(res: ServerResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : "Internal server error.";
  send(res, 500, { error: message });
}

// ─────────────────────────────────────────────────────────────────────────────

export class ApiRouter {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly commentService: CommentService,
    private readonly notificationService: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method?.toUpperCase() ?? "GET";
    const rawUrl = req.url ?? "/";
    const pathOnly = rawUrl.split("?")[0];
    const segs = segments(pathOnly);
    const query = parseQuery(rawUrl);

    try {
      // ── /users[/:id] ───────────────────────────────────────────────────────
      if (segs[0] === "users") {
        await this.handleUsers(method, segs, query, req, res);

      // ── /projects[/:id[/members[/:uid]]] ──────────────────────────────────
      } else if (segs[0] === "projects") {
        await this.handleProjects(method, segs, query, req, res);

      // ── /tasks[/:id[/status|assign]] ──────────────────────────────────────
      } else if (segs[0] === "tasks") {
        await this.handleTasks(method, segs, query, req, res);

      // ── /comments[/:id] ───────────────────────────────────────────────────
      } else if (segs[0] === "comments") {
        await this.handleComments(method, segs, query, req, res);

      // ── /notifications[/:id/read] ─────────────────────────────────────────
      } else if (segs[0] === "notifications") {
        await this.handleNotifications(method, segs, query, req, res);

      } else {
        notFound(res, `No route for "${rawUrl}".`);
      }
    } catch (err) {
      // Surface validation/not-found errors thrown by services
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("not found")) {
          notFound(res, err.message);
        } else {
          // Treat other service errors as bad requests (validation failures)
          badRequest(res, err.message);
        }
      } else {
        serverError(res, err);
      }
    }
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  private async handleUsers(
    method: string,
    segs: string[],
    _query: Record<string, string>,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segs[1]; // may be undefined

    if (!id) {
      // /users
      if (method === "GET") {
        ok(res, this.userService.listUsers());
      } else if (method === "POST") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const user = this.userService.createUser({
          name: String(body.name ?? ""),
          email: String(body.email ?? ""),
        });
        created(res, user);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    // /users/:id
    if (method === "GET") {
      ok(res, this.userService.getUser(id));
    } else if (method === "PUT") {
      const body = (await readBody(req)) as Record<string, unknown>;
      const updated = this.userService.updateUser(id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        email: body.email !== undefined ? String(body.email) : undefined,
      });
      ok(res, updated);
    } else if (method === "DELETE") {
      this.userService.deleteUser(id);
      noContent(res);
    } else {
      methodNotAllowed(res);
    }
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  private async handleProjects(
    method: string,
    segs: string[],
    _query: Record<string, string>,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segs[1];       // project id
    const sub = segs[2];      // "members" or undefined
    const memberId = segs[3]; // specific member uid or undefined

    if (!id) {
      // /projects
      if (method === "GET") {
        ok(res, this.projectService.listProjects());
      } else if (method === "POST") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const project = this.projectService.createProject({
          name: String(body.name ?? ""),
          description: String(body.description ?? ""),
        });
        created(res, project);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    if (!sub) {
      // /projects/:id
      if (method === "GET") {
        ok(res, this.projectService.getProject(id));
      } else if (method === "PUT") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const updated = this.projectService.updateProject(id, {
          name: body.name !== undefined ? String(body.name) : undefined,
          description: body.description !== undefined ? String(body.description) : undefined,
        });
        ok(res, updated);
      } else if (method === "DELETE") {
        // Cascade: remove tasks (and implicitly comments) for this project
        this.taskService.deleteTasksByProject(id);
        this.projectService.deleteProject(id);
        noContent(res);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    if (sub !== "members") {
      notFound(res, `Unknown sub-resource "${sub}".`);
      return;
    }

    if (!memberId) {
      // /projects/:id/members
      if (method === "POST") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const userId = String(body.userId ?? "");
        if (!userId) {
          badRequest(res, "userId is required.");
          return;
        }
        // Validate user exists before mutating project
        this.userService.getUser(userId); // throws if missing
        const project = this.projectService.addMember(id, userId);
        ok(res, project);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    // /projects/:id/members/:uid
    if (method === "DELETE") {
      const project = this.projectService.removeMember(id, memberId);
      ok(res, project);
    } else {
      methodNotAllowed(res);
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  private async handleTasks(
    method: string,
    segs: string[],
    query: Record<string, string>,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segs[1];   // task id
    const sub = segs[2];  // "status" | "assign" | undefined

    if (!id) {
      // /tasks[?projectId=…]
      if (method === "GET") {
        ok(res, this.taskService.listTasks(query.projectId));
      } else if (method === "POST") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const projectId = String(body.projectId ?? "");
        if (!projectId) {
          badRequest(res, "projectId is required.");
          return;
        }
        // Validate project exists before creating task
        this.projectService.getProject(projectId); // throws if missing
        const task = this.taskService.createTask({
          title: String(body.title ?? ""),
          description: String(body.description ?? ""),
          projectId,
        });
        created(res, task);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    if (!sub) {
      // /tasks/:id
      if (method === "GET") {
        ok(res, this.taskService.getTask(id));
      } else if (method === "PUT") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const updated = this.taskService.updateTask(id, {
          title: body.title !== undefined ? String(body.title) : undefined,
          description: body.description !== undefined ? String(body.description) : undefined,
        });
        ok(res, updated);
      } else if (method === "DELETE") {
        // Cascade: remove comments for this task
        this.commentService.deleteCommentsByTask(id);
        this.taskService.deleteTask(id);
        noContent(res);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    // /tasks/:id/status
    if (sub === "status") {
      if (method !== "PUT") { methodNotAllowed(res); return; }
      const body = (await readBody(req)) as Record<string, unknown>;
      const status = String(body.status ?? "") as TaskStatus;
      const updated = this.taskService.setStatus(id, status);
      ok(res, updated);
      return;
    }

    // /tasks/:id/assign
    if (sub === "assign") {
      if (method !== "PUT") { methodNotAllowed(res); return; }
      const body = (await readBody(req)) as Record<string, unknown>;
      const userId = String(body.userId ?? "");
      if (!userId) {
        badRequest(res, "userId is required.");
        return;
      }
      // Validate user exists
      this.userService.getUser(userId); // throws if missing
      const updated = this.taskService.assignTask(id, userId);
      ok(res, updated);
      return;
    }

    notFound(res, `Unknown task sub-resource "${sub}".`);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  private async handleComments(
    method: string,
    segs: string[],
    query: Record<string, string>,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segs[1];

    if (!id) {
      // /comments[?taskId=…]
      if (method === "GET") {
        ok(res, this.commentService.listComments(query.taskId));
      } else if (method === "POST") {
        const body = (await readBody(req)) as Record<string, unknown>;
        const taskId = String(body.taskId ?? "");
        const authorId = String(body.authorId ?? "");

        if (!taskId) { badRequest(res, "taskId is required."); return; }
        if (!authorId) { badRequest(res, "authorId is required."); return; }

        // Validate task and author exist; retrieve context for event payload
        const task = this.taskService.getTask(taskId); // throws if missing
        this.userService.getUser(authorId);             // throws if missing

        const comment = this.commentService.createComment({
          taskId,
          authorId,
          body: String(body.body ?? ""),
          taskTitle: task.title,
          assigneeId: task.assigneeId,
        });
        created(res, comment);
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    // /comments/:id
    if (method === "GET") {
      ok(res, this.commentService.getComment(id));
    } else if (method === "DELETE") {
      this.commentService.deleteComment(id);
      noContent(res);
    } else {
      methodNotAllowed(res);
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  private async handleNotifications(
    method: string,
    segs: string[],
    query: Record<string, string>,
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segs[1];   // notification id
    const sub = segs[2];  // "read"

    if (!id) {
      // /notifications[?userId=…]
      if (method === "GET") {
        ok(res, this.notificationService.listNotifications(query.userId));
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    // /notifications/:id/read
    if (sub === "read") {
      if (method !== "PUT") { methodNotAllowed(res); return; }
      const updated = this.notificationService.markAsRead(id);
      ok(res, updated);
      return;
    }

    // /notifications/:id (no sub-resource other than "read" is supported)
    if (!sub) {
      if (method === "GET") {
        ok(res, this.notificationService.getNotification(id));
      } else {
        methodNotAllowed(res);
      }
      return;
    }

    notFound(res, `Unknown notification sub-resource "${sub}".`);
  }
}
