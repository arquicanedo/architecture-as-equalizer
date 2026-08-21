import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  IUserService,
  IProjectService,
  ITaskService,
  ICommentService,
  INotificationService,
  TaskStatus,
} from "./types";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function sendJSON(res: ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: ServerResponse, statusCode: number, message: string): void {
  sendJSON(res, statusCode, { error: message });
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
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

function parsePathSegments(pathname: string): string[] {
  return pathname.split("/").filter((s) => s.length > 0);
}

// ----------------------------------------------------------------
// Router class
// ----------------------------------------------------------------

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
    const baseURL = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", baseURL);
    const pathname = url.pathname;
    const method = req.method ?? "GET";
    const segments = parsePathSegments(pathname);

    try {
      await this.dispatch(req, res, method, segments, url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      // Map common "not found" errors to 404
      if (message.toLowerCase().includes("not found")) {
        sendError(res, 404, message);
      } else if (
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("transition")
      ) {
        sendError(res, 400, message);
      } else {
        sendError(res, 500, message);
      }
    }
  }

  private async dispatch(
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    segments: string[],
    url: URL
  ): Promise<void> {
    const [resource, id, sub] = segments;

    // ----------------------------------------------------------------
    // /users
    // ----------------------------------------------------------------
    if (resource === "users") {
      if (!id) {
        // GET /users
        if (method === "GET") {
          return sendJSON(res, 200, this.userService.getAll());
        }
        // POST /users
        if (method === "POST") {
          const body = (await readBody(req)) as { name: string; email: string };
          const user = this.userService.create(body);
          return sendJSON(res, 201, user);
        }
      } else {
        // GET /users/:id
        if (method === "GET") {
          return sendJSON(res, 200, this.userService.getById(id));
        }
        // PUT /users/:id
        if (method === "PUT") {
          const body = (await readBody(req)) as Partial<{ name: string; email: string }>;
          return sendJSON(res, 200, this.userService.update(id, body));
        }
        // DELETE /users/:id
        if (method === "DELETE") {
          this.userService.delete(id);
          return sendJSON(res, 204, null);
        }
      }
    }

    // ----------------------------------------------------------------
    // /projects
    // ----------------------------------------------------------------
    if (resource === "projects") {
      if (!id) {
        // GET /projects
        if (method === "GET") {
          return sendJSON(res, 200, this.projectService.getAll());
        }
        // POST /projects
        if (method === "POST") {
          const body = (await readBody(req)) as { name: string; description: string };
          return sendJSON(res, 201, this.projectService.create(body));
        }
      } else if (!sub) {
        // GET /projects/:id
        if (method === "GET") {
          return sendJSON(res, 200, this.projectService.getById(id));
        }
        // PUT /projects/:id
        if (method === "PUT") {
          const body = (await readBody(req)) as Partial<{ name: string; description: string }>;
          return sendJSON(res, 200, this.projectService.update(id, body));
        }
        // DELETE /projects/:id
        if (method === "DELETE") {
          this.projectService.delete(id);
          return sendJSON(res, 204, null);
        }
      } else if (sub === "members") {
        // POST /projects/:id/members
        if (method === "POST") {
          const body = (await readBody(req)) as { userId: string };
          return sendJSON(res, 200, this.projectService.addMember(id, body.userId));
        }
        // DELETE /projects/:id/members
        if (method === "DELETE") {
          const body = (await readBody(req)) as { userId: string };
          return sendJSON(res, 200, this.projectService.removeMember(id, body.userId));
        }
      }
    }

    // ----------------------------------------------------------------
    // /tasks
    // ----------------------------------------------------------------
    if (resource === "tasks") {
      if (!id) {
        // GET /tasks?projectId=X
        if (method === "GET") {
          const projectId = url.searchParams.get("projectId");
          if (!projectId) {
            return sendError(res, 400, "Missing required query parameter: projectId");
          }
          return sendJSON(res, 200, this.taskService.getByProject(projectId));
        }
        // POST /tasks
        if (method === "POST") {
          const body = (await readBody(req)) as {
            title: string;
            description: string;
            projectId: string;
          };
          return sendJSON(res, 201, this.taskService.create(body));
        }
      } else if (!sub) {
        // GET /tasks/:id
        if (method === "GET") {
          return sendJSON(res, 200, this.taskService.getById(id));
        }
        // PUT /tasks/:id
        if (method === "PUT") {
          const body = (await readBody(req)) as Partial<{ title: string; description: string }>;
          return sendJSON(res, 200, this.taskService.update(id, body));
        }
        // DELETE /tasks/:id
        if (method === "DELETE") {
          this.taskService.delete(id);
          return sendJSON(res, 204, null);
        }
      } else if (sub === "status") {
        // PUT /tasks/:id/status
        if (method === "PUT") {
          const body = (await readBody(req)) as { status: TaskStatus };
          return sendJSON(res, 200, this.taskService.changeStatus(id, body.status));
        }
      } else if (sub === "assign") {
        // PUT /tasks/:id/assign
        if (method === "PUT") {
          const body = (await readBody(req)) as { assigneeId: string };
          return sendJSON(res, 200, this.taskService.assign(id, body.assigneeId));
        }
      }
    }

    // ----------------------------------------------------------------
    // /comments
    // ----------------------------------------------------------------
    if (resource === "comments") {
      if (!id) {
        // GET /comments?taskId=X
        if (method === "GET") {
          const taskId = url.searchParams.get("taskId");
          if (!taskId) {
            return sendError(res, 400, "Missing required query parameter: taskId");
          }
          return sendJSON(res, 200, this.commentService.getByTask(taskId));
        }
        // POST /comments
        if (method === "POST") {
          const body = (await readBody(req)) as {
            taskId: string;
            authorId: string;
            body: string;
          };
          return sendJSON(res, 201, this.commentService.create(body));
        }
      } else {
        // GET /comments/:id
        if (method === "GET") {
          return sendJSON(res, 200, this.commentService.getById(id));
        }
        // DELETE /comments/:id
        if (method === "DELETE") {
          this.commentService.delete(id);
          return sendJSON(res, 204, null);
        }
      }
    }

    // ----------------------------------------------------------------
    // /notifications
    // ----------------------------------------------------------------
    if (resource === "notifications") {
      if (!id) {
        // GET /notifications?userId=X
        if (method === "GET") {
          const userId = url.searchParams.get("userId");
          if (!userId) {
            return sendError(res, 400, "Missing required query parameter: userId");
          }
          return sendJSON(res, 200, this.notificationService.getByUser(userId));
        }
      } else if (sub === "read") {
        // PUT /notifications/:id/read
        if (method === "PUT") {
          return sendJSON(res, 200, this.notificationService.markAsRead(id));
        }
      }
    }

    // ----------------------------------------------------------------
    // 404 fallback
    // ----------------------------------------------------------------
    sendError(res, 404, `Route not found: ${method} ${url.pathname}`);
  }
}
