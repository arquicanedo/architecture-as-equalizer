/**
 * API Router — single HTTP entry point.
 * Parses requests, delegates to the appropriate service method,
 * and serialises responses as JSON.
 *
 * Services expose plain TypeScript methods; no service contains
 * any HTTP-handling code.
 */

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";

// ---- Helpers ----------------------------------------------------------------

/** Read and JSON-parse the request body. */
function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data) as Record<string, unknown>);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/** Send a JSON response. */
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

/** Send a standardised error response. */
function sendError(res: ServerResponse, status: number, message: string): void {
  send(res, status, { error: message });
}

// ---- Route matching helpers -------------------------------------------------

type RouteSegments = string[];

/**
 * Match a URL pathname against a pattern.
 * Pattern segments starting with ":" are wildcards; their values are
 * returned in the `params` object.
 *
 * Example: matchPath("/tasks/abc/status", "/tasks/:id/status")
 *          → { id: "abc" }  (truthy)
 *
 * Returns null when the path does not match.
 */
function matchPath(
  pathname: string,
  pattern: string
): Record<string, string> | null {
  const pathSegs: RouteSegments = pathname.split("/").filter(Boolean);
  const patternSegs: RouteSegments = pattern.split("/").filter(Boolean);

  if (pathSegs.length !== patternSegs.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegs.length; i++) {
    const pSeg = patternSegs[i];
    const uSeg = pathSegs[i];
    if (pSeg.startsWith(":")) {
      params[pSeg.slice(1)] = uSeg;
    } else if (pSeg !== uSeg) {
      return null;
    }
  }
  return params;
}

// ---- Router class -----------------------------------------------------------

export class Router {
  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private commentService: CommentService,
    private notificationService: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const baseUrl = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", baseUrl);
    const pathname = url.pathname;
    const method = req.method ?? "GET";

    try {
      // ---- USER routes -------------------------------------------------------
      // GET /users
      if (method === "GET" && matchPath(pathname, "/users") !== null) {
        return send(res, 200, this.userService.getAll());
      }
      // POST /users
      if (method === "POST" && matchPath(pathname, "/users") !== null) {
        const body = await readBody(req);
        const user = this.userService.create(
          body.name as string,
          body.email as string
        );
        return send(res, 201, user);
      }
      // GET /users/:id
      {
        const params = matchPath(pathname, "/users/:id");
        if (params && method === "GET") {
          return send(res, 200, this.userService.getById(params.id));
        }
        // PUT /users/:id
        if (params && method === "PUT") {
          const body = await readBody(req);
          return send(res, 200, this.userService.update(params.id, body as { name?: string; email?: string }));
        }
        // DELETE /users/:id
        if (params && method === "DELETE") {
          this.userService.delete(params.id);
          return send(res, 204, null);
        }
      }

      // ---- PROJECT routes ----------------------------------------------------
      // GET /projects
      if (method === "GET" && matchPath(pathname, "/projects") !== null) {
        return send(res, 200, this.projectService.getAll());
      }
      // POST /projects
      if (method === "POST" && matchPath(pathname, "/projects") !== null) {
        const body = await readBody(req);
        const project = this.projectService.create(
          body.name as string,
          body.description as string
        );
        return send(res, 201, project);
      }
      // GET|PUT|DELETE /projects/:id
      {
        const params = matchPath(pathname, "/projects/:id");
        if (params) {
          if (method === "GET") {
            return send(res, 200, this.projectService.getById(params.id));
          }
          if (method === "PUT") {
            const body = await readBody(req);
            return send(res, 200, this.projectService.update(params.id, body as { name?: string; description?: string }));
          }
          if (method === "DELETE") {
            this.projectService.delete(params.id);
            return send(res, 204, null);
          }
        }
      }
      // POST /projects/:id/members
      {
        const params = matchPath(pathname, "/projects/:id/members");
        if (params) {
          if (method === "POST") {
            const body = await readBody(req);
            return send(res, 200, this.projectService.addMember(params.id, body.userId as string));
          }
          // DELETE /projects/:id/members
          if (method === "DELETE") {
            const body = await readBody(req);
            return send(res, 200, this.projectService.removeMember(params.id, body.userId as string));
          }
        }
      }

      // ---- TASK routes -------------------------------------------------------
      // GET /tasks?projectId=X
      if (method === "GET" && matchPath(pathname, "/tasks") !== null) {
        const projectId = url.searchParams.get("projectId");
        if (projectId) {
          return send(res, 200, this.taskService.getByProject(projectId));
        }
        return sendError(res, 400, "projectId query parameter is required");
      }
      // POST /tasks
      if (method === "POST" && matchPath(pathname, "/tasks") !== null) {
        const body = await readBody(req);
        const task = this.taskService.create(
          body.title as string,
          body.description as string,
          body.projectId as string
        );
        return send(res, 201, task);
      }
      // PUT /tasks/:id/status
      {
        const params = matchPath(pathname, "/tasks/:id/status");
        if (params && method === "PUT") {
          const body = await readBody(req);
          const task = this.taskService.changeStatus(
            params.id,
            body.status as "todo" | "in-progress" | "done"
          );
          return send(res, 200, task);
        }
      }
      // PUT /tasks/:id/assign
      {
        const params = matchPath(pathname, "/tasks/:id/assign");
        if (params && method === "PUT") {
          const body = await readBody(req);
          const task = this.taskService.assign(
            params.id,
            (body.assigneeId as string | null) ?? null
          );
          return send(res, 200, task);
        }
      }
      // GET|PUT|DELETE /tasks/:id
      {
        const params = matchPath(pathname, "/tasks/:id");
        if (params) {
          if (method === "GET") {
            return send(res, 200, this.taskService.getById(params.id));
          }
          if (method === "PUT") {
            const body = await readBody(req);
            return send(res, 200, this.taskService.update(params.id, body as { title?: string; description?: string }));
          }
          if (method === "DELETE") {
            this.taskService.delete(params.id);
            return send(res, 204, null);
          }
        }
      }

      // ---- COMMENT routes ----------------------------------------------------
      // GET /comments?taskId=X
      if (method === "GET" && matchPath(pathname, "/comments") !== null) {
        const taskId = url.searchParams.get("taskId");
        if (taskId) {
          return send(res, 200, this.commentService.getByTask(taskId));
        }
        return sendError(res, 400, "taskId query parameter is required");
      }
      // POST /comments
      if (method === "POST" && matchPath(pathname, "/comments") !== null) {
        const body = await readBody(req);
        const taskId = body.taskId as string;
        const authorId = body.authorId as string;
        const commentBody = body.body as string;

        // Resolve display names in the router so comment-service stays decoupled
        const task = this.taskService.getById(taskId);
        const author = this.userService.getById(authorId);

        // Pass assigneeId via the event payload so notification-service can
        // notify the task assignee without querying task-service directly.
        // We embed it in the event payload inside comment-service by passing
        // it as an extra field through the body here.
        // Because comment-service's create() already publishes the event,
        // we need to attach assigneeId BEFORE the publish. We do this by
        // temporarily monkey-patching — actually, cleanest approach is to
        // just pass it as a parameter to create() and let it forward it.
        // We'll add assigneeId as an extra param (see comment-service).
        const comment = this.commentService.create(
          taskId,
          authorId,
          commentBody,
          task.title,
          author.name,
          task.assigneeId  // forwarded so NotificationService can notify assignee
        );
        return send(res, 201, comment);
      }
      // GET|DELETE /comments/:id
      {
        const params = matchPath(pathname, "/comments/:id");
        if (params) {
          if (method === "GET") {
            return send(res, 200, this.commentService.getById(params.id));
          }
          if (method === "DELETE") {
            this.commentService.delete(params.id);
            return send(res, 204, null);
          }
        }
      }

      // ---- NOTIFICATION routes -----------------------------------------------
      // GET /notifications?userId=X
      if (method === "GET" && matchPath(pathname, "/notifications") !== null) {
        const userId = url.searchParams.get("userId");
        if (userId) {
          return send(res, 200, this.notificationService.getByUser(userId));
        }
        return sendError(res, 400, "userId query parameter is required");
      }
      // PUT /notifications/:id/read
      {
        const params = matchPath(pathname, "/notifications/:id/read");
        if (params && method === "PUT") {
          return send(res, 200, this.notificationService.markAsRead(params.id));
        }
      }

      // ---- 404 ---------------------------------------------------------------
      sendError(res, 404, `Cannot ${method} ${pathname}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Distinguish "not found" errors from general server errors
      if (message.includes("not found") || message.toLowerCase().includes("not found")) {
        sendError(res, 404, message);
      } else if (
        message.includes("Invalid status transition") ||
        message.includes("required") ||
        message.includes("Invalid JSON")
      ) {
        sendError(res, 400, message);
      } else {
        sendError(res, 500, message);
      }
    }
  }
}
