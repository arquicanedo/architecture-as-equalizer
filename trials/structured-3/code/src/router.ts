/**
 * API Router
 * Single HTTP entry point. Parses requests, delegates to services, returns JSON.
 * Uses Node.js built-in `http` module only.
 */

import { IncomingMessage, ServerResponse } from "http";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService, TaskStatus } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
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
  statusCode: number,
  body: unknown
): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(res: ServerResponse, statusCode: number, message: string): void {
  send(res, statusCode, { error: message });
}

/** Parse path segments and query string from the raw URL. */
function parsePath(req: IncomingMessage): {
  segments: string[];
  query: Record<string, string>;
} {
  const rawUrl = req.url ?? "/";
  const [pathPart, queryPart] = rawUrl.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }
  return { segments, query };
}

// ── Router class ─────────────────────────────────────────────────────────────

export class Router {
  constructor(
    private readonly users: UserService,
    private readonly projects: ProjectService,
    private readonly tasks: TaskService,
    private readonly comments: CommentService,
    private readonly notifications: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const method = req.method ?? "GET";
      const { segments, query } = parsePath(req);
      const [resource, id, subResource] = segments;

      // ── /users ──────────────────────────────────────────────────────────────
      if (resource === "users") {
        if (!id) {
          if (method === "GET") {
            return send(res, 200, this.users.getAll());
          }
          if (method === "POST") {
            const body = await readBody(req) as Record<string, unknown>;
            const user = this.users.create({
              name: body.name as string,
              email: body.email as string,
            });
            return send(res, 201, user);
          }
        } else {
          if (method === "GET") {
            const user = this.users.getById(id);
            return send(res, 200, user);
          }
          if (method === "PUT") {
            const body = await readBody(req) as Record<string, unknown>;
            const user = this.users.update(id, {
              name: body.name as string | undefined,
              email: body.email as string | undefined,
            });
            return send(res, 200, user);
          }
          if (method === "DELETE") {
            this.users.delete(id);
            return send(res, 200, { message: "User deleted" });
          }
        }
      }

      // ── /projects ───────────────────────────────────────────────────────────
      if (resource === "projects") {
        if (!id) {
          if (method === "GET") {
            return send(res, 200, this.projects.getAll());
          }
          if (method === "POST") {
            const body = await readBody(req) as Record<string, unknown>;
            const project = this.projects.create({
              name: body.name as string,
              description: (body.description as string | undefined) ?? "",
              memberIds: (body.memberIds as string[] | undefined) ?? [],
            });
            return send(res, 201, project);
          }
        } else if (!subResource) {
          if (method === "GET") {
            return send(res, 200, this.projects.getById(id));
          }
          if (method === "PUT") {
            const body = await readBody(req) as Record<string, unknown>;
            const project = this.projects.update(id, {
              name: body.name as string | undefined,
              description: body.description as string | undefined,
            });
            return send(res, 200, project);
          }
          if (method === "DELETE") {
            this.projects.delete(id);
            return send(res, 200, { message: "Project deleted" });
          }
        } else if (subResource === "members") {
          if (method === "POST") {
            const body = await readBody(req) as Record<string, unknown>;
            const userId = body.userId as string;
            if (!userId) return sendError(res, 400, "userId is required");
            const project = this.projects.addMember(id, userId);
            return send(res, 200, project);
          }
          if (method === "DELETE") {
            const body = await readBody(req) as Record<string, unknown>;
            const userId = body.userId as string;
            if (!userId) return sendError(res, 400, "userId is required");
            const project = this.projects.removeMember(id, userId);
            return send(res, 200, project);
          }
        }
      }

      // ── /tasks ──────────────────────────────────────────────────────────────
      if (resource === "tasks") {
        if (!id) {
          if (method === "GET") {
            if (query.projectId) {
              return send(res, 200, this.tasks.getByProject(query.projectId));
            }
            return send(res, 200, this.tasks.getAll());
          }
          if (method === "POST") {
            const body = await readBody(req) as Record<string, unknown>;
            const task = this.tasks.create({
              title: body.title as string,
              description: body.description as string | undefined,
              projectId: body.projectId as string,
              assigneeId: body.assigneeId as string | null | undefined,
            });
            return send(res, 201, task);
          }
        } else if (!subResource) {
          if (method === "GET") {
            return send(res, 200, this.tasks.getById(id));
          }
          if (method === "PUT") {
            const body = await readBody(req) as Record<string, unknown>;
            const task = this.tasks.update(id, {
              title: body.title as string | undefined,
              description: body.description as string | undefined,
            });
            return send(res, 200, task);
          }
          if (method === "DELETE") {
            this.tasks.delete(id);
            return send(res, 200, { message: "Task deleted" });
          }
        } else if (subResource === "status") {
          if (method === "PUT") {
            const body = await readBody(req) as Record<string, unknown>;
            const status = body.status as TaskStatus;
            if (!status) return sendError(res, 400, "status is required");
            const task = this.tasks.changeStatus(id, status);
            return send(res, 200, task);
          }
        } else if (subResource === "assign") {
          if (method === "PUT") {
            const body = await readBody(req) as Record<string, unknown>;
            const assigneeId = body.assigneeId as string;
            if (!assigneeId) return sendError(res, 400, "assigneeId is required");
            const task = this.tasks.assign(id, assigneeId);
            return send(res, 200, task);
          }
        }
      }

      // ── /comments ───────────────────────────────────────────────────────────
      if (resource === "comments") {
        if (!id) {
          if (method === "GET") {
            if (query.taskId) {
              return send(res, 200, this.comments.getByTask(query.taskId));
            }
            return sendError(res, 400, "taskId query parameter is required");
          }
          if (method === "POST") {
            const body = await readBody(req) as Record<string, unknown>;
            const taskId = body.taskId as string;
            const authorId = body.authorId as string;
            const commentBody = body.body as string;

            // Router resolves enriched data (task title, author name) so that
            // neither CommentService nor NotificationService needs to cross
            // service boundaries — satisfying ADR-001 and ADR-002.
            const task = this.tasks.getById(taskId);
            const author = this.users.getById(authorId);

            const comment = this.comments.create({
              taskId,
              authorId,
              body: commentBody,
              taskTitle: task.title,
              authorName: author.name,
            });

            // Notify the task's assignee about the new comment (if there is
            // one and it's not the commenter themselves).
            if (task.assigneeId && task.assigneeId !== authorId) {
              this.notifications.createForUser(
                task.assigneeId,
                `${author.name} commented on task "${task.title}" (${task.id}): "${commentBody.slice(0, 80)}"`
              );
            }

            return send(res, 201, comment);
          }
        } else {
          if (method === "GET") {
            return send(res, 200, this.comments.getById(id));
          }
          if (method === "DELETE") {
            this.comments.delete(id);
            return send(res, 200, { message: "Comment deleted" });
          }
        }
      }

      // ── /notifications ──────────────────────────────────────────────────────
      if (resource === "notifications") {
        if (!id) {
          if (method === "GET") {
            if (!query.userId) {
              return sendError(res, 400, "userId query parameter is required");
            }
            return send(res, 200, this.notifications.getByUser(query.userId));
          }
        } else if (!subResource) {
          // no bare /notifications/:id endpoint in spec — fall through to 404
        } else if (subResource === "read") {
          if (method === "PUT") {
            const notification = this.notifications.markAsRead(id);
            return send(res, 200, notification);
          }
        }
      }

      // ── 404 ─────────────────────────────────────────────────────────────────
      sendError(res, 404, `Cannot ${method} /${segments.join("/")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      // Distinguish "not found" style errors from true 500s
      if (
        message.startsWith("User not found") ||
        message.startsWith("Project not found") ||
        message.startsWith("Task not found") ||
        message.startsWith("Comment not found") ||
        message.startsWith("Notification not found")
      ) {
        sendError(res, 404, message);
      } else if (message.startsWith("Invalid status transition") || message.startsWith("Invalid status")) {
        sendError(res, 422, message);
      } else if (message.includes("is required") || message === "Invalid JSON body") {
        sendError(res, 400, message);
      } else {
        sendError(res, 500, message);
      }
    }
  }
}
