/**
 * API Router — sole HTTP entry point.
 * Parses requests, delegates to services, and serialises responses as JSON.
 * This is the only module that is permitted to reference multiple services
 * simultaneously (ADR-002). Services themselves never call each other.
 *
 * Route table:
 *   GET    /users                    UserService.getAll
 *   POST   /users                    UserService.create
 *   GET    /users/:id                UserService.getById
 *   PUT    /users/:id                UserService.update
 *   DELETE /users/:id                UserService.delete
 *
 *   GET    /projects                 ProjectService.getAll
 *   POST   /projects                 ProjectService.create
 *   GET    /projects/:id             ProjectService.getById
 *   PUT    /projects/:id             ProjectService.update
 *   DELETE /projects/:id             ProjectService.delete
 *   POST   /projects/:id/members     ProjectService.addMember
 *   DELETE /projects/:id/members     ProjectService.removeMember
 *
 *   GET    /tasks?projectId=X        TaskService.getByProject (or getAll)
 *   POST   /tasks                    TaskService.create
 *   GET    /tasks/:id                TaskService.getById
 *   PUT    /tasks/:id                TaskService.update
 *   DELETE /tasks/:id                TaskService.delete
 *   PUT    /tasks/:id/status         TaskService.changeStatus
 *   PUT    /tasks/:id/assign         TaskService.assign
 *
 *   GET    /comments?taskId=X        CommentService.getByTask
 *   POST   /comments                 CommentService.create
 *   GET    /comments/:id             CommentService.getById
 *   DELETE /comments/:id             CommentService.delete
 *
 *   GET    /notifications?userId=X   NotificationService.getByUser
 *   PUT    /notifications/:id/read   NotificationService.markAsRead
 */

import { IncomingMessage, ServerResponse } from "http";
import { ApiError } from "./errors.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService, TaskStatus } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        resolve(
          typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {}
        );
      } catch {
        reject(new ApiError("Invalid JSON body", 400));
      }
    });
    req.on("error", (err) => reject(new ApiError(err.message, 400)));
  });
}

function send(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const sendOk = (res: ServerResponse, data: unknown): void =>
  send(res, 200, data);
const sendCreated = (res: ServerResponse, data: unknown): void =>
  send(res, 201, data);
const sendError = (res: ServerResponse, status: number, msg: string): void =>
  send(res, status, { error: msg });

function queryParam(req: IncomingMessage, key: string): string | null {
  const url = new URL(req.url ?? "/", "http://localhost");
  return url.searchParams.get(key);
}

// ─── Path matching ────────────────────────────────────────────────────────────

interface RouteMatch {
  params: Record<string, string>;
}

/**
 * Match a URL pattern against a concrete pathname.
 * Pattern segments starting with ":" are captured as named params.
 * Returns null when the pathname does not match.
 */
function matchPath(pattern: string, pathname: string): RouteMatch | null {
  const pp = pattern.split("/").filter(Boolean);
  const vp = pathname.split("/").filter(Boolean);
  if (pp.length !== vp.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) {
      params[pp[i].slice(1)] = vp[i];
    } else if (pp[i] !== vp[i]) {
      return null;
    }
  }
  return { params };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export class Router {
  constructor(
    private readonly users: UserService,
    private readonly projects: ProjectService,
    private readonly tasks: TaskService,
    private readonly comments: CommentService,
    private readonly notifications: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = (req.method ?? "GET").toUpperCase();
    const rawPath = new URL(req.url ?? "/", "http://localhost").pathname;
    // Strip trailing slash (except bare "/")
    const pathname =
      rawPath.length > 1 && rawPath.endsWith("/")
        ? rawPath.slice(0, -1)
        : rawPath;

    try {
      await this.dispatch(method, pathname, req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        sendError(res, err.statusCode, err.message);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        sendError(res, 500, message);
      }
    }
  }

  private async dispatch(
    method: string,
    pathname: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    let m: RouteMatch | null;

    // ── Users ─────────────────────────────────────────────────────────────

    if (method === "GET" && pathname === "/users") {
      return sendOk(res, this.users.getAll());
    }

    if (method === "POST" && pathname === "/users") {
      const body = await readBody(req);
      return sendCreated(
        res,
        this.users.create({
          name: String(body.name ?? ""),
          email: String(body.email ?? ""),
        })
      );
    }

    if ((m = matchPath("/users/:id", pathname))) {
      const { id } = m.params;
      if (method === "GET") return sendOk(res, this.users.getById(id));
      if (method === "PUT") {
        const body = await readBody(req);
        return sendOk(
          res,
          this.users.update(id, {
            name: body.name !== undefined ? String(body.name) : undefined,
            email: body.email !== undefined ? String(body.email) : undefined,
          })
        );
      }
      if (method === "DELETE") {
        this.users.delete(id);
        return sendOk(res, { message: "User deleted" });
      }
    }

    // ── Projects ──────────────────────────────────────────────────────────

    if (method === "GET" && pathname === "/projects") {
      return sendOk(res, this.projects.getAll());
    }

    if (method === "POST" && pathname === "/projects") {
      const body = await readBody(req);
      return sendCreated(
        res,
        this.projects.create({
          name: String(body.name ?? ""),
          description: String(body.description ?? ""),
          memberIds: Array.isArray(body.memberIds)
            ? (body.memberIds as string[])
            : [],
        })
      );
    }

    // /projects/:id/members — must be matched BEFORE /projects/:id
    if ((m = matchPath("/projects/:id/members", pathname))) {
      const { id } = m.params;
      const body = await readBody(req);
      const userId = String(body.userId ?? "");
      if (method === "POST")
        return sendOk(res, this.projects.addMember(id, userId));
      if (method === "DELETE")
        return sendOk(res, this.projects.removeMember(id, userId));
    }

    if ((m = matchPath("/projects/:id", pathname))) {
      const { id } = m.params;
      if (method === "GET") return sendOk(res, this.projects.getById(id));
      if (method === "PUT") {
        const body = await readBody(req);
        return sendOk(
          res,
          this.projects.update(id, {
            name: body.name !== undefined ? String(body.name) : undefined,
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
          })
        );
      }
      if (method === "DELETE") {
        this.projects.delete(id);
        return sendOk(res, { message: "Project deleted" });
      }
    }

    // ── Tasks ─────────────────────────────────────────────────────────────

    if (method === "GET" && pathname === "/tasks") {
      const projectId = queryParam(req, "projectId");
      return sendOk(
        res,
        projectId ? this.tasks.getByProject(projectId) : this.tasks.getAll()
      );
    }

    if (method === "POST" && pathname === "/tasks") {
      const body = await readBody(req);
      return sendCreated(
        res,
        this.tasks.create({
          title: String(body.title ?? ""),
          description:
            body.description !== undefined
              ? String(body.description)
              : undefined,
          projectId: String(body.projectId ?? ""),
          assigneeId:
            body.assigneeId !== undefined
              ? String(body.assigneeId)
              : undefined,
        })
      );
    }

    // /tasks/:id/status — match BEFORE /tasks/:id
    if ((m = matchPath("/tasks/:id/status", pathname))) {
      const { id } = m.params;
      if (method === "PUT") {
        const body = await readBody(req);
        return sendOk(
          res,
          this.tasks.changeStatus(id, body.status as TaskStatus)
        );
      }
    }

    // /tasks/:id/assign — match BEFORE /tasks/:id
    if ((m = matchPath("/tasks/:id/assign", pathname))) {
      const { id } = m.params;
      if (method === "PUT") {
        const body = await readBody(req);
        return sendOk(
          res,
          this.tasks.assign(id, String(body.assigneeId ?? ""))
        );
      }
    }

    if ((m = matchPath("/tasks/:id", pathname))) {
      const { id } = m.params;
      if (method === "GET") return sendOk(res, this.tasks.getById(id));
      if (method === "PUT") {
        const body = await readBody(req);
        return sendOk(
          res,
          this.tasks.update(id, {
            title: body.title !== undefined ? String(body.title) : undefined,
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
          })
        );
      }
      if (method === "DELETE") {
        this.tasks.delete(id);
        return sendOk(res, { message: "Task deleted" });
      }
    }

    // ── Comments ──────────────────────────────────────────────────────────

    if (method === "GET" && pathname === "/comments") {
      const taskId = queryParam(req, "taskId");
      if (!taskId)
        throw new ApiError("taskId query parameter is required", 400);
      return sendOk(res, this.comments.getByTask(taskId));
    }

    if (method === "POST" && pathname === "/comments") {
      const body = await readBody(req);
      const taskId = String(body.taskId ?? "");
      const authorId = String(body.authorId ?? "");

      // Cross-service data resolution happens here in the router (ADR-002).
      // CommentService needs taskTitle, authorName, and taskAssigneeId for its
      // event payload but must not import TaskService or UserService directly.
      const task = this.tasks.getById(taskId);
      const author = this.users.getById(authorId);

      return sendCreated(
        res,
        this.comments.create({
          taskId,
          authorId,
          body: String(body.body ?? ""),
          taskTitle: task.title,
          authorName: author.name,
          taskAssigneeId: task.assigneeId,
        })
      );
    }

    if ((m = matchPath("/comments/:id", pathname))) {
      const { id } = m.params;
      if (method === "GET") return sendOk(res, this.comments.getById(id));
      if (method === "DELETE") {
        this.comments.delete(id);
        return sendOk(res, { message: "Comment deleted" });
      }
    }

    // ── Notifications ─────────────────────────────────────────────────────

    if (method === "GET" && pathname === "/notifications") {
      const userId = queryParam(req, "userId");
      if (!userId)
        throw new ApiError("userId query parameter is required", 400);
      return sendOk(res, this.notifications.getByUser(userId));
    }

    if ((m = matchPath("/notifications/:id/read", pathname))) {
      const { id } = m.params;
      if (method === "PUT")
        return sendOk(res, this.notifications.markAsRead(id));
    }

    // ── 404 ───────────────────────────────────────────────────────────────
    throw new ApiError(`Route not found: ${method} ${pathname}`, 404);
  }
}
