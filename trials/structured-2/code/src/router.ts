/**
 * API Router
 * Single HTTP entry point. Parses requests, delegates to services, returns JSON.
 * Uses only Node.js built-in `http` module — no frameworks.
 */

import { IncomingMessage, ServerResponse } from "http";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService, TaskStatus } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
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

function ok(res: ServerResponse, data: unknown): void {
  send(res, 200, data);
}

function created(res: ServerResponse, data: unknown): void {
  send(res, 201, data);
}

function notFound(res: ServerResponse, message = "Not found"): void {
  send(res, 404, { error: message });
}

function badRequest(res: ServerResponse, message: string): void {
  send(res, 400, { error: message });
}

function methodNotAllowed(res: ServerResponse): void {
  send(res, 405, { error: "Method not allowed" });
}

/** Parse URL path segments and query-string parameters. */
function parseRequest(req: IncomingMessage): {
  segments: string[];
  query: Record<string, string>;
} {
  const raw = req.url ?? "/";
  const qIdx = raw.indexOf("?");
  const pathPart = qIdx === -1 ? raw : raw.slice(0, qIdx);
  const queryPart = qIdx === -1 ? "" : raw.slice(qIdx + 1);

  const segments = pathPart.split("/").filter(Boolean);

  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      query[decodeURIComponent(pair.slice(0, eqIdx))] =
        decodeURIComponent(pair.slice(eqIdx + 1));
    }
  }

  return { segments, query };
}

/** Map error messages to appropriate HTTP status codes. */
function errorStatus(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes("not found")) return 404;
  if (
    lower.includes("invalid") ||
    lower.includes("required") ||
    lower.includes("transition") ||
    lower.includes("already")
  )
    return 400;
  return 500;
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createRouter(
  userService: UserService,
  projectService: ProjectService,
  taskService: TaskService,
  commentService: CommentService,
  notificationService: NotificationService
) {
  return async function handler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const method = (req.method ?? "GET").toUpperCase();
    const { segments, query } = parseRequest(req);

    try {
      // -----------------------------------------------------------------------
      // /users  and  /users/:id
      // -----------------------------------------------------------------------
      if (segments[0] === "users") {
        const id = segments[1];

        if (!id) {
          if (method === "GET") return ok(res, userService.getAll());
          if (method === "POST") {
            const body = await readBody(req);
            return created(res, userService.create(body as { name: string; email: string }));
          }
          return methodNotAllowed(res);
        }

        // /users/:id
        if (method === "GET") return ok(res, userService.getById(id));
        if (method === "PUT") {
          const body = await readBody(req);
          return ok(res, userService.update(id, body));
        }
        if (method === "DELETE") {
          userService.delete(id);
          return ok(res, { deleted: true });
        }
        return methodNotAllowed(res);
      }

      // -----------------------------------------------------------------------
      // /projects  and  /projects/:id  and  /projects/:id/members
      // -----------------------------------------------------------------------
      if (segments[0] === "projects") {
        const id = segments[1];
        const sub = segments[2]; // "members" | undefined

        if (!id) {
          if (method === "GET") return ok(res, projectService.getAll());
          if (method === "POST") {
            const body = await readBody(req);
            return created(res, projectService.create(body as { name: string; description: string }));
          }
          return methodNotAllowed(res);
        }

        if (sub === "members") {
          // /projects/:id/members
          if (method === "POST") {
            const body = await readBody(req);
            return ok(res, projectService.addMember(id, body.userId));
          }
          if (method === "DELETE") {
            const body = await readBody(req);
            return ok(res, projectService.removeMember(id, body.userId));
          }
          return methodNotAllowed(res);
        }

        // /projects/:id
        if (method === "GET") return ok(res, projectService.getById(id));
        if (method === "PUT") {
          const body = await readBody(req);
          return ok(res, projectService.update(id, body));
        }
        if (method === "DELETE") {
          projectService.delete(id);
          return ok(res, { deleted: true });
        }
        return methodNotAllowed(res);
      }

      // -----------------------------------------------------------------------
      // /tasks  and  /tasks/:id  and  /tasks/:id/status  /tasks/:id/assign
      // -----------------------------------------------------------------------
      if (segments[0] === "tasks") {
        const id = segments[1];
        const sub = segments[2]; // "status" | "assign" | undefined

        if (!id) {
          if (method === "GET") {
            return query.projectId
              ? ok(res, taskService.getByProject(query.projectId))
              : ok(res, taskService.getAll());
          }
          if (method === "POST") {
            const body = await readBody(req);
            return created(res, taskService.create(body as {
              title: string;
              description?: string;
              projectId: string;
              assigneeId?: string;
            }));
          }
          return methodNotAllowed(res);
        }

        if (sub === "status") {
          // /tasks/:id/status
          if (method === "PUT") {
            const body = await readBody(req);
            return ok(res, taskService.changeStatus(id, body.status as TaskStatus));
          }
          return methodNotAllowed(res);
        }

        if (sub === "assign") {
          // /tasks/:id/assign
          if (method === "PUT") {
            const body = await readBody(req);
            return ok(res, taskService.assign(id, body.assigneeId));
          }
          return methodNotAllowed(res);
        }

        // /tasks/:id
        if (method === "GET") return ok(res, taskService.getById(id));
        if (method === "PUT") {
          const body = await readBody(req);
          return ok(res, taskService.update(id, body));
        }
        if (method === "DELETE") {
          taskService.delete(id);
          return ok(res, { deleted: true });
        }
        return methodNotAllowed(res);
      }

      // -----------------------------------------------------------------------
      // /comments  and  /comments/:id
      // -----------------------------------------------------------------------
      if (segments[0] === "comments") {
        const id = segments[1];

        if (!id) {
          if (method === "GET") {
            if (!query.taskId)
              return badRequest(res, "taskId query param required");
            return ok(res, commentService.getByTask(query.taskId));
          }
          if (method === "POST") {
            const body = await readBody(req);

            // Resolve enrichment data in the router so that neither the
            // CommentService nor the NotificationService must call other
            // services directly — all inter-service data flows through the
            // Event Bus payload.
            const task = taskService.getById(body.taskId);
            const user = userService.getById(body.authorId);

            const comment = commentService.create({
              taskId: body.taskId,
              authorId: body.authorId,
              body: body.body,
              taskTitle: task.title,
              authorName: user.name,
              assigneeId: task.assigneeId, // forwarded in event payload
            });

            return created(res, comment);
          }
          return methodNotAllowed(res);
        }

        // /comments/:id
        if (method === "GET") return ok(res, commentService.getById(id));
        if (method === "DELETE") {
          commentService.delete(id);
          return ok(res, { deleted: true });
        }
        return methodNotAllowed(res);
      }

      // -----------------------------------------------------------------------
      // /notifications?userId=X  and  /notifications/:id/read
      // -----------------------------------------------------------------------
      if (segments[0] === "notifications") {
        const id = segments[1];
        const sub = segments[2]; // "read" | undefined

        if (!id) {
          if (method === "GET") {
            if (!query.userId)
              return badRequest(res, "userId query param required");
            return ok(res, notificationService.getByUser(query.userId));
          }
          return methodNotAllowed(res);
        }

        if (sub === "read") {
          // /notifications/:id/read
          if (method === "PUT") {
            return ok(res, notificationService.markAsRead(id));
          }
          return methodNotAllowed(res);
        }

        return notFound(res);
      }

      // -----------------------------------------------------------------------
      // 404 fallback
      // -----------------------------------------------------------------------
      notFound(res, `Route not found: ${method} /${segments.join("/")}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      send(res, errorStatus(message), { error: message });
    }
  };
}
