import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { TaskStatus } from "./services/task-service.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body."));
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
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  send(res, status, { error: message });
}

/** Split pathname into clean, non-empty segments. */
function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

// ── Router ───────────────────────────────────────────────────────────────────

export class Router {
  private userSvc: UserService;
  private projectSvc: ProjectService;
  private taskSvc: TaskService;
  private commentSvc: CommentService;
  private notifSvc: NotificationService;

  constructor(
    userSvc: UserService,
    projectSvc: ProjectService,
    taskSvc: TaskService,
    commentSvc: CommentService,
    notifSvc: NotificationService
  ) {
    this.userSvc = userSvc;
    this.projectSvc = projectSvc;
    this.taskSvc = taskSvc;
    this.commentSvc = commentSvc;
    this.notifSvc = notifSvc;
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const baseUrl = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", baseUrl);
    const pathname = url.pathname;
    const method = req.method ?? "GET";
    const segs = segments(pathname);

    try {
      // ── /users ──────────────────────────────────────────────────────────
      if (segs[0] === "users") {
        await this.handleUsers(req, res, method, segs, url);
        return;
      }

      // ── /projects ───────────────────────────────────────────────────────
      if (segs[0] === "projects") {
        await this.handleProjects(req, res, method, segs, url);
        return;
      }

      // ── /tasks ──────────────────────────────────────────────────────────
      if (segs[0] === "tasks") {
        await this.handleTasks(req, res, method, segs, url);
        return;
      }

      // ── /comments ───────────────────────────────────────────────────────
      if (segs[0] === "comments") {
        await this.handleComments(req, res, method, segs, url);
        return;
      }

      // ── /notifications ──────────────────────────────────────────────────
      if (segs[0] === "notifications") {
        await this.handleNotifications(req, res, method, segs, url);
        return;
      }

      sendError(res, 404, "Route not found.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error.";
      sendError(res, 500, message);
    }
  }

  // ── /users handlers ────────────────────────────────────────────────────────

  private async handleUsers(
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    segs: string[],
    _url: URL
  ): Promise<void> {
    // GET /users
    if (segs.length === 1 && method === "GET") {
      send(res, 200, this.userSvc.listAll());
      return;
    }

    // POST /users
    if (segs.length === 1 && method === "POST") {
      const body = await readBody(req) as Record<string, unknown>;
      const user = this.userSvc.create({
        name: body.name as string,
        email: body.email as string,
      });
      send(res, 201, user);
      return;
    }

    // GET /users/:id
    if (segs.length === 2 && method === "GET") {
      const user = this.userSvc.getById(segs[1]);
      if (!user) { sendError(res, 404, "User not found."); return; }
      send(res, 200, user);
      return;
    }

    // PUT /users/:id
    if (segs.length === 2 && method === "PUT") {
      const body = await readBody(req) as Record<string, unknown>;
      const user = this.userSvc.update(segs[1], {
        name: body.name as string | undefined,
        email: body.email as string | undefined,
      });
      if (!user) { sendError(res, 404, "User not found."); return; }
      send(res, 200, user);
      return;
    }

    // DELETE /users/:id
    if (segs.length === 2 && method === "DELETE") {
      const deleted = this.userSvc.delete(segs[1]);
      if (!deleted) { sendError(res, 404, "User not found."); return; }
      res.writeHead(204);
      res.end();
      return;
    }

    sendError(res, 405, "Method not allowed.");
  }

  // ── /projects handlers ─────────────────────────────────────────────────────

  private async handleProjects(
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    segs: string[],
    _url: URL
  ): Promise<void> {
    // GET /projects
    if (segs.length === 1 && method === "GET") {
      send(res, 200, this.projectSvc.listAll());
      return;
    }

    // POST /projects
    if (segs.length === 1 && method === "POST") {
      const body = await readBody(req) as Record<string, unknown>;
      const project = this.projectSvc.create({
        name: body.name as string,
        description: body.description as string,
      });
      send(res, 201, project);
      return;
    }

    // GET /projects/:id
    if (segs.length === 2 && method === "GET") {
      const project = this.projectSvc.getById(segs[1]);
      if (!project) { sendError(res, 404, "Project not found."); return; }
      send(res, 200, project);
      return;
    }

    // PUT /projects/:id
    if (segs.length === 2 && method === "PUT") {
      const body = await readBody(req) as Record<string, unknown>;
      const project = this.projectSvc.update(segs[1], {
        name: body.name as string | undefined,
        description: body.description as string | undefined,
      });
      if (!project) { sendError(res, 404, "Project not found."); return; }
      send(res, 200, project);
      return;
    }

    // DELETE /projects/:id
    if (segs.length === 2 && method === "DELETE") {
      const deleted = this.projectSvc.delete(segs[1]);
      if (!deleted) { sendError(res, 404, "Project not found."); return; }
      res.writeHead(204);
      res.end();
      return;
    }

    // POST /projects/:id/members  — add member
    if (segs.length === 3 && segs[2] === "members" && method === "POST") {
      const body = await readBody(req) as Record<string, unknown>;
      const userId = body.userId as string;
      if (!userId) { sendError(res, 400, "userId is required."); return; }

      const project = this.projectSvc.addMember(segs[1], userId);
      if (!project) { sendError(res, 404, "Project not found."); return; }
      send(res, 200, project);
      return;
    }

    // DELETE /projects/:id/members  — remove member
    if (segs.length === 3 && segs[2] === "members" && method === "DELETE") {
      const body = await readBody(req) as Record<string, unknown>;
      const userId = body.userId as string;
      if (!userId) { sendError(res, 400, "userId is required."); return; }

      const project = this.projectSvc.removeMember(segs[1], userId);
      if (!project) { sendError(res, 404, "Project not found."); return; }
      send(res, 200, project);
      return;
    }

    sendError(res, 405, "Method not allowed.");
  }

  // ── /tasks handlers ────────────────────────────────────────────────────────

  private async handleTasks(
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    segs: string[],
    url: URL
  ): Promise<void> {
    // GET /tasks?projectId=...
    if (segs.length === 1 && method === "GET") {
      const projectId = url.searchParams.get("projectId");
      if (!projectId) {
        sendError(res, 400, "Query parameter 'projectId' is required.");
        return;
      }
      send(res, 200, this.taskSvc.listByProject(projectId));
      return;
    }

    // POST /tasks
    if (segs.length === 1 && method === "POST") {
      const body = await readBody(req) as Record<string, unknown>;
      const task = this.taskSvc.create({
        title: body.title as string,
        description: body.description as string,
        projectId: body.projectId as string,
      });
      send(res, 201, task);
      return;
    }

    // GET /tasks/:id
    if (segs.length === 2 && method === "GET") {
      const task = this.taskSvc.getById(segs[1]);
      if (!task) { sendError(res, 404, "Task not found."); return; }
      send(res, 200, task);
      return;
    }

    // PUT /tasks/:id
    if (segs.length === 2 && method === "PUT") {
      const body = await readBody(req) as Record<string, unknown>;
      const task = this.taskSvc.update(segs[1], {
        title: body.title as string | undefined,
        description: body.description as string | undefined,
      });
      if (!task) { sendError(res, 404, "Task not found."); return; }
      send(res, 200, task);
      return;
    }

    // DELETE /tasks/:id
    if (segs.length === 2 && method === "DELETE") {
      const deleted = this.taskSvc.delete(segs[1]);
      if (!deleted) { sendError(res, 404, "Task not found."); return; }
      res.writeHead(204);
      res.end();
      return;
    }

    // PUT /tasks/:id/status
    if (segs.length === 3 && segs[2] === "status" && method === "PUT") {
      const body = await readBody(req) as Record<string, unknown>;
      const newStatus = body.status as TaskStatus;
      if (!newStatus) { sendError(res, 400, "status is required."); return; }

      // Existence check first so we can return 404 vs 400 correctly
      const existing = this.taskSvc.getById(segs[1]);
      if (!existing) { sendError(res, 404, "Task not found."); return; }

      try {
        const task = this.taskSvc.changeStatus(segs[1], newStatus);
        send(res, 200, task);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid status transition.";
        sendError(res, 400, message);
      }
      return;
    }

    // PUT /tasks/:id/assign
    if (segs.length === 3 && segs[2] === "assign" && method === "PUT") {
      const body = await readBody(req) as Record<string, unknown>;
      const assigneeId = body.assigneeId as string;
      if (!assigneeId) { sendError(res, 400, "assigneeId is required."); return; }

      const task = this.taskSvc.assignTask(segs[1], assigneeId);
      if (!task) { sendError(res, 404, "Task not found."); return; }
      send(res, 200, task);
      return;
    }

    sendError(res, 405, "Method not allowed.");
  }

  // ── /comments handlers ─────────────────────────────────────────────────────

  private async handleComments(
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    segs: string[],
    url: URL
  ): Promise<void> {
    // GET /comments?taskId=...
    if (segs.length === 1 && method === "GET") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        sendError(res, 400, "Query parameter 'taskId' is required.");
        return;
      }
      send(res, 200, this.commentSvc.listByTask(taskId));
      return;
    }

    // POST /comments
    // The router resolves task title and author name before calling the service,
    // keeping services decoupled from each other.
    if (segs.length === 1 && method === "POST") {
      const body = await readBody(req) as Record<string, unknown>;
      const taskId = body.taskId as string;
      const authorId = body.authorId as string;

      if (!taskId) { sendError(res, 400, "taskId is required."); return; }
      if (!authorId) { sendError(res, 400, "authorId is required."); return; }

      // Resolve cross-service data at the router layer (allowed — router is the
      // single entry point and may read from multiple services to build context).
      const task = this.taskSvc.getById(taskId);
      if (!task) { sendError(res, 404, "Task not found."); return; }

      const author = this.userSvc.getById(authorId);
      if (!author) { sendError(res, 404, "Author (user) not found."); return; }

      const comment = this.commentSvc.create({
        taskId,
        authorId,
        body: body.body as string,
        taskTitle: task.title,
        authorName: author.name,
      });
      send(res, 201, comment);
      return;
    }

    // GET /comments/:id
    if (segs.length === 2 && method === "GET") {
      const comment = this.commentSvc.getById(segs[1]);
      if (!comment) { sendError(res, 404, "Comment not found."); return; }
      send(res, 200, comment);
      return;
    }

    // DELETE /comments/:id
    if (segs.length === 2 && method === "DELETE") {
      const deleted = this.commentSvc.delete(segs[1]);
      if (!deleted) { sendError(res, 404, "Comment not found."); return; }
      res.writeHead(204);
      res.end();
      return;
    }

    sendError(res, 405, "Method not allowed.");
  }

  // ── /notifications handlers ────────────────────────────────────────────────

  private async handleNotifications(
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    segs: string[],
    url: URL
  ): Promise<void> {
    // GET /notifications?userId=...
    if (segs.length === 1 && method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        sendError(res, 400, "Query parameter 'userId' is required.");
        return;
      }
      send(res, 200, this.notifSvc.listByUser(userId));
      return;
    }

    // PUT /notifications/:id/read
    if (segs.length === 3 && segs[2] === "read" && method === "PUT") {
      const notification = this.notifSvc.markAsRead(segs[1]);
      if (!notification) { sendError(res, 404, "Notification not found."); return; }
      send(res, 200, notification);
      return;
    }

    sendError(res, 405, "Method not allowed.");
  }
}
