/**
 * API Router — single HTTP entry point.
 * Parses requests, delegates to services, serialises responses.
 * All HTTP concerns live here; services are pure TypeScript classes.
 *
 * The router is the only place that may call multiple services in sequence
 * to gather context (e.g., resolving a task title before creating a comment).
 * Services themselves must NEVER call each other directly.
 */

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

import {
  userService,
  UserNotFoundError,
  UserValidationError,
} from "./services/user-service.js";
import {
  projectService,
  ProjectNotFoundError,
  ProjectValidationError,
} from "./services/project-service.js";
import {
  taskService,
  TaskNotFoundError,
  TaskValidationError,
  TaskStatusTransitionError,
  TaskStatus,
} from "./services/task-service.js";
import {
  commentService,
  CommentNotFoundError,
  CommentValidationError,
} from "./services/comment-service.js";
import {
  notificationService,
  NotificationNotFoundError,
} from "./services/notification-service.js";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Read the full request body as a UTF-8 string. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Parse JSON body; returns null if body is empty or not valid JSON. */
async function parseBody<T>(req: IncomingMessage): Promise<T | null> {
  const raw = await readBody(req);
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialise and send a JSON response. */
function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Map known domain errors to appropriate HTTP status codes. */
function errorResponse(res: ServerResponse, err: unknown): void {
  if (
    err instanceof UserNotFoundError ||
    err instanceof ProjectNotFoundError ||
    err instanceof TaskNotFoundError ||
    err instanceof CommentNotFoundError ||
    err instanceof NotificationNotFoundError
  ) {
    return json(res, 404, { error: (err as Error).message });
  }
  if (
    err instanceof UserValidationError ||
    err instanceof ProjectValidationError ||
    err instanceof TaskValidationError ||
    err instanceof TaskStatusTransitionError ||
    err instanceof CommentValidationError
  ) {
    return json(res, 400, { error: (err as Error).message });
  }
  console.error("[Router] Unhandled error:", err);
  json(res, 500, { error: "Internal server error" });
}

/**
 * Split a URL pathname into non-empty segments.
 * "/users/abc" → ["users", "abc"]
 */
function pathSegments(pathname: string): string[] {
  return pathname.replace(/^\//, "").split("/").filter(Boolean);
}

// ---------------------------------------------------------------------------
// Main request handler
// ---------------------------------------------------------------------------

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const base = `http://${req.headers.host ?? "localhost"}`;
  const url = new URL(req.url ?? "/", base);
  const method = req.method?.toUpperCase() ?? "GET";
  const parts = pathSegments(url.pathname);
  const [resource, id, sub] = parts; // e.g. ["tasks", "abc-123", "status"]

  try {
    // =========================================================================
    // /users  and  /users/:id
    // =========================================================================
    if (resource === "users") {
      if (!id) {
        if (method === "GET") {
          return json(res, 200, userService.getAll());
        }
        if (method === "POST") {
          const body = await parseBody<{ name: string; email: string }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });
          return json(res, 201, userService.create(body));
        }
      } else {
        if (method === "GET") {
          return json(res, 200, userService.getById(id));
        }
        if (method === "PUT") {
          const body = await parseBody<{ name?: string; email?: string }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });
          return json(res, 200, userService.update(id, body));
        }
        if (method === "DELETE") {
          userService.delete(id);
          return json(res, 204, null);
        }
      }
    }

    // =========================================================================
    // /projects,  /projects/:id,  /projects/:id/members
    // =========================================================================
    if (resource === "projects") {
      if (!id) {
        if (method === "GET") {
          return json(res, 200, projectService.getAll());
        }
        if (method === "POST") {
          const body = await parseBody<{ name: string; description: string }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });
          return json(res, 201, projectService.create(body));
        }
      } else if (!sub) {
        if (method === "GET") {
          return json(res, 200, projectService.getById(id));
        }
        if (method === "PUT") {
          const body = await parseBody<{ name?: string; description?: string }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });
          return json(res, 200, projectService.update(id, body));
        }
        if (method === "DELETE") {
          projectService.delete(id);
          return json(res, 204, null);
        }
      } else if (sub === "members") {
        if (method === "POST") {
          const body = await parseBody<{ userId: string }>(req);
          if (!body?.userId) {
            return json(res, 400, { error: "userId is required" });
          }
          return json(res, 200, projectService.addMember(id, body.userId));
        }
        if (method === "DELETE") {
          const body = await parseBody<{ userId: string }>(req);
          if (!body?.userId) {
            return json(res, 400, { error: "userId is required" });
          }
          return json(res, 200, projectService.removeMember(id, body.userId));
        }
      }
    }

    // =========================================================================
    // /tasks,  /tasks/:id,  /tasks/:id/status,  /tasks/:id/assign
    // GET /tasks requires ?projectId=X
    // =========================================================================
    if (resource === "tasks") {
      if (!id) {
        if (method === "GET") {
          const projectId = url.searchParams.get("projectId");
          if (!projectId) {
            return json(res, 400, { error: "projectId query parameter is required" });
          }
          return json(res, 200, taskService.getByProject(projectId));
        }
        if (method === "POST") {
          const body = await parseBody<{
            title: string;
            description: string;
            projectId: string;
            assigneeId?: string | null;
          }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });
          return json(res, 201, taskService.create(body));
        }
      } else if (!sub) {
        if (method === "GET") {
          return json(res, 200, taskService.getById(id));
        }
        if (method === "PUT") {
          const body = await parseBody<{ title?: string; description?: string }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });
          return json(res, 200, taskService.update(id, body));
        }
        if (method === "DELETE") {
          taskService.delete(id);
          return json(res, 204, null);
        }
      } else if (sub === "status") {
        if (method === "PUT") {
          const body = await parseBody<{ status: TaskStatus }>(req);
          if (!body?.status) {
            return json(res, 400, { error: "status is required" });
          }
          return json(res, 200, taskService.changeStatus(id, body.status));
        }
      } else if (sub === "assign") {
        if (method === "PUT") {
          // Body must be present; assigneeId may be null to unassign.
          const body = await parseBody<{ assigneeId: string | null }>(req);
          if (body === null) {
            return json(res, 400, { error: "Request body is required" });
          }
          return json(res, 200, taskService.assign(id, body.assigneeId ?? null));
        }
      }
    }

    // =========================================================================
    // /comments  and  /comments/:id
    // GET /comments requires ?taskId=X
    // POST /comments resolves taskTitle, authorName, taskAssigneeId via router
    // =========================================================================
    if (resource === "comments") {
      if (!id) {
        if (method === "GET") {
          const taskId = url.searchParams.get("taskId");
          if (!taskId) {
            return json(res, 400, { error: "taskId query parameter is required" });
          }
          return json(res, 200, commentService.getByTask(taskId));
        }
        if (method === "POST") {
          const body = await parseBody<{
            taskId: string;
            authorId: string;
            body: string;
          }>(req);
          if (!body) return json(res, 400, { error: "Request body is required" });

          // The router resolves cross-service context so comment service
          // never has to call task or user service directly.
          const task = taskService.getById(body.taskId);   // 404 if missing
          const author = userService.getById(body.authorId); // 404 if missing

          const comment = commentService.create({
            taskId: body.taskId,
            authorId: body.authorId,
            body: body.body,
            taskTitle: task.title,
            authorName: author.name,
            taskAssigneeId: task.assigneeId,
          });

          return json(res, 201, comment);
        }
      } else {
        if (method === "GET") {
          return json(res, 200, commentService.getById(id));
        }
        if (method === "DELETE") {
          commentService.delete(id);
          return json(res, 204, null);
        }
      }
    }

    // =========================================================================
    // /notifications?userId=X  and  /notifications/:id/read
    // =========================================================================
    if (resource === "notifications") {
      if (!id) {
        if (method === "GET") {
          const userId = url.searchParams.get("userId");
          if (!userId) {
            return json(res, 400, { error: "userId query parameter is required" });
          }
          return json(res, 200, notificationService.getByUser(userId));
        }
      } else if (sub === "read") {
        if (method === "PUT") {
          return json(res, 200, notificationService.markAsRead(id));
        }
      }
    }

    // =========================================================================
    // 404 — no route matched
    // =========================================================================
    json(res, 404, { error: `Cannot ${method} ${url.pathname}` });
  } catch (err) {
    errorResponse(res, err);
  }
}
