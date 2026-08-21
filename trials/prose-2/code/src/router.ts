import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { UserService } from "./user-service";
import { ProjectService } from "./project-service";
import { TaskService } from "./task-service";
import { CommentService } from "./comment-service";
import { NotificationService } from "./notification-service";
import { ApiRequest, ApiResponse, TaskStatus } from "./types";

// ── Helper: read the full request body as a string ───────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ── Route Matching ────────────────────────────────────────────────────────────

interface RouteMatch {
  params: Record<string, string>;
}

/**
 * A tiny route pattern matcher.
 * Patterns may contain :param segments (e.g. "/users/:id").
 * Returns null when the pattern does not match.
 */
function matchRoute(pattern: string, pathname: string): RouteMatch | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const vp = pathParts[i];

    if (pp.startsWith(":")) {
      params[pp.slice(1)] = decodeURIComponent(vp);
    } else if (pp !== vp) {
      return null;
    }
  }

  return { params };
}

// ── Router ───────────────────────────────────────────────────────────────────

export class Router {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly commentService: CommentService,
    private readonly notificationService: NotificationService
  ) {}

  /** Entry point — called by the HTTP server for every request. */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Parse URL and query string
    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    const method = (req.method ?? "GET").toUpperCase();

    // Parse query string into a plain object
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });

    // Parse body for any method that might carry one (POST, PUT, PATCH, DELETE)
    // DELETE with a body is used for /projects/:id/members and /comments/:id
    let body: unknown = null;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const raw = await readBody(req);
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          this.send(res, { status: 400, body: { error: "Invalid JSON body" } });
          return;
        }
      }
    }

    const apiReq: ApiRequest = {
      method,
      path: pathname,
      params: {},
      query,
      body,
    };

    let apiRes: ApiResponse;

    try {
      apiRes = this.route(apiReq);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      apiRes = { status: 500, body: { error: message } };
    }

    this.send(res, apiRes);
  }

  // ── Response serialisation ─────────────────────────────────────────────────

  private send(res: ServerResponse, apiRes: ApiResponse): void {
    const json = JSON.stringify(apiRes.body, null, 2);
    res.writeHead(apiRes.status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  }

  // ── Route Dispatch ─────────────────────────────────────────────────────────

  private route(req: ApiRequest): ApiResponse {
    const { method, path } = req;

    // ── Users ──────────────────────────────────────────────────────────────

    if (method === "GET" && path === "/users") {
      return this.listUsers();
    }

    if (method === "POST" && path === "/users") {
      return this.createUser(req);
    }

    {
      const m = matchRoute("/users/:id", path);
      if (m) {
        req.params = m.params;
        if (method === "GET") return this.getUser(req);
        if (method === "PUT") return this.updateUser(req);
        if (method === "DELETE") return this.deleteUser(req);
      }
    }

    // ── Projects ───────────────────────────────────────────────────────────

    if (method === "GET" && path === "/projects") {
      return this.listProjects();
    }

    if (method === "POST" && path === "/projects") {
      return this.createProject(req);
    }

    {
      const m = matchRoute("/projects/:id", path);
      if (m) {
        req.params = m.params;
        if (method === "GET") return this.getProject(req);
        if (method === "PUT") return this.updateProject(req);
        if (method === "DELETE") return this.deleteProject(req);
      }
    }

    {
      const m = matchRoute("/projects/:id/members", path);
      if (m) {
        req.params = m.params;
        if (method === "POST") return this.addMember(req);
        if (method === "DELETE") return this.removeMember(req);
      }
    }

    // ── Tasks ──────────────────────────────────────────────────────────────

    if (method === "GET" && path === "/tasks") {
      return this.listTasks(req);
    }

    if (method === "POST" && path === "/tasks") {
      return this.createTask(req);
    }

    {
      const m = matchRoute("/tasks/:id", path);
      if (m) {
        req.params = m.params;
        if (method === "GET") return this.getTask(req);
        if (method === "PUT") return this.updateTask(req);
        if (method === "DELETE") return this.deleteTask(req);
      }
    }

    {
      const m = matchRoute("/tasks/:id/status", path);
      if (m) {
        req.params = m.params;
        if (method === "PUT") return this.changeTaskStatus(req);
      }
    }

    {
      const m = matchRoute("/tasks/:id/assign", path);
      if (m) {
        req.params = m.params;
        if (method === "PUT") return this.assignTask(req);
      }
    }

    // ── Comments ───────────────────────────────────────────────────────────

    if (method === "GET" && path === "/comments") {
      return this.listComments(req);
    }

    if (method === "POST" && path === "/comments") {
      return this.createComment(req);
    }

    {
      const m = matchRoute("/comments/:id", path);
      if (m) {
        req.params = m.params;
        if (method === "GET") return this.getComment(req);
        if (method === "DELETE") return this.deleteComment(req);
      }
    }

    // ── Notifications ──────────────────────────────────────────────────────

    if (method === "GET" && path === "/notifications") {
      return this.listNotifications(req);
    }

    {
      const m = matchRoute("/notifications/:id/read", path);
      if (m) {
        req.params = m.params;
        if (method === "PUT") return this.markNotificationRead(req);
      }
    }

    // ── 404 ────────────────────────────────────────────────────────────────

    return { status: 404, body: { error: `Cannot ${method} ${path}` } };
  }

  // ── User Handlers ──────────────────────────────────────────────────────────

  private listUsers(): ApiResponse {
    return { status: 200, body: this.userService.getAllUsers() };
  }

  private createUser(req: ApiRequest): ApiResponse {
    const data = req.body as { name?: string; email?: string };
    const user = this.userService.createUser({
      name: data?.name ?? "",
      email: data?.email ?? "",
    });
    return { status: 201, body: user };
  }

  private getUser(req: ApiRequest): ApiResponse {
    const user = this.userService.getUser(req.params.id);
    return { status: 200, body: user };
  }

  private updateUser(req: ApiRequest): ApiResponse {
    const data = req.body as Partial<{ name: string; email: string }>;
    const user = this.userService.updateUser(req.params.id, data ?? {});
    return { status: 200, body: user };
  }

  private deleteUser(req: ApiRequest): ApiResponse {
    this.userService.deleteUser(req.params.id);
    return { status: 200, body: { message: "User deleted" } };
  }

  // ── Project Handlers ───────────────────────────────────────────────────────

  private listProjects(): ApiResponse {
    return { status: 200, body: this.projectService.getAllProjects() };
  }

  private createProject(req: ApiRequest): ApiResponse {
    const data = req.body as { name?: string; description?: string };
    const project = this.projectService.createProject({
      name: data?.name ?? "",
      description: data?.description ?? "",
    });
    return { status: 201, body: project };
  }

  private getProject(req: ApiRequest): ApiResponse {
    const project = this.projectService.getProject(req.params.id);
    return { status: 200, body: project };
  }

  private updateProject(req: ApiRequest): ApiResponse {
    const data = req.body as Partial<{ name: string; description: string }>;
    const project = this.projectService.updateProject(
      req.params.id,
      data ?? {}
    );
    return { status: 200, body: project };
  }

  private deleteProject(req: ApiRequest): ApiResponse {
    this.projectService.deleteProject(req.params.id);
    return { status: 200, body: { message: "Project deleted" } };
  }

  private addMember(req: ApiRequest): ApiResponse {
    const data = req.body as { userId?: string };
    const userId = data?.userId;
    if (!userId) {
      return { status: 400, body: { error: "userId is required" } };
    }
    // Validate user exists
    if (!this.userService.exists(userId)) {
      return { status: 404, body: { error: `User "${userId}" not found` } };
    }
    const project = this.projectService.addMember(req.params.id, userId);
    return { status: 200, body: project };
  }

  private removeMember(req: ApiRequest): ApiResponse {
    const data = req.body as { userId?: string };
    const userId = data?.userId;
    if (!userId) {
      return { status: 400, body: { error: "userId is required" } };
    }
    const project = this.projectService.removeMember(req.params.id, userId);
    return { status: 200, body: project };
  }

  // ── Task Handlers ──────────────────────────────────────────────────────────

  private listTasks(req: ApiRequest): ApiResponse {
    const { projectId } = req.query;
    const tasks = projectId
      ? this.taskService.getTasksByProject(projectId)
      : this.taskService.getAllTasks();
    return { status: 200, body: tasks };
  }

  private createTask(req: ApiRequest): ApiResponse {
    const data = req.body as {
      title?: string;
      description?: string;
      projectId?: string;
      assigneeId?: string | null;
    };

    if (!data?.projectId) {
      return { status: 400, body: { error: "projectId is required" } };
    }

    // Validate project exists
    if (!this.projectService.exists(data.projectId)) {
      return {
        status: 404,
        body: { error: `Project "${data.projectId}" not found` },
      };
    }

    // Validate assignee if provided
    if (data.assigneeId && !this.userService.exists(data.assigneeId)) {
      return {
        status: 404,
        body: { error: `User "${data.assigneeId}" not found` },
      };
    }

    const task = this.taskService.createTask({
      title: data?.title ?? "",
      description: data?.description,
      projectId: data.projectId,
      assigneeId: data?.assigneeId,
    });

    return { status: 201, body: task };
  }

  private getTask(req: ApiRequest): ApiResponse {
    const task = this.taskService.getTask(req.params.id);
    return { status: 200, body: task };
  }

  private updateTask(req: ApiRequest): ApiResponse {
    const data = req.body as Partial<{ title: string; description: string }>;
    const task = this.taskService.updateTask(req.params.id, data ?? {});
    return { status: 200, body: task };
  }

  private deleteTask(req: ApiRequest): ApiResponse {
    // Clean up comments before deleting the task
    this.commentService.deleteCommentsByTask(req.params.id);
    this.taskService.deleteTask(req.params.id);
    return { status: 200, body: { message: "Task deleted" } };
  }

  private changeTaskStatus(req: ApiRequest): ApiResponse {
    const data = req.body as { status?: string };
    const newStatus = data?.status as TaskStatus | undefined;

    if (!newStatus) {
      return { status: 400, body: { error: "status is required" } };
    }

    const validStatuses: TaskStatus[] = ["todo", "in-progress", "done"];
    if (!validStatuses.includes(newStatus)) {
      return {
        status: 400,
        body: {
          error: `Invalid status "${newStatus}". Must be one of: ${validStatuses.join(", ")}`,
        },
      };
    }

    const task = this.taskService.changeStatus(req.params.id, newStatus);
    return { status: 200, body: task };
  }

  private assignTask(req: ApiRequest): ApiResponse {
    const data = req.body as { assigneeId?: string };
    const assigneeId = data?.assigneeId;

    if (!assigneeId) {
      return { status: 400, body: { error: "assigneeId is required" } };
    }

    // Validate user exists
    if (!this.userService.exists(assigneeId)) {
      return {
        status: 404,
        body: { error: `User "${assigneeId}" not found` },
      };
    }

    const task = this.taskService.assignTask(req.params.id, assigneeId);
    return { status: 200, body: task };
  }

  // ── Comment Handlers ───────────────────────────────────────────────────────

  private listComments(req: ApiRequest): ApiResponse {
    const { taskId } = req.query;
    if (!taskId) {
      return {
        status: 400,
        body: { error: "taskId query parameter is required" },
      };
    }
    const comments = this.commentService.getCommentsByTask(taskId);
    return { status: 200, body: comments };
  }

  private createComment(req: ApiRequest): ApiResponse {
    const data = req.body as {
      taskId?: string;
      authorId?: string;
      body?: string;
    };

    if (!data?.taskId) {
      return { status: 400, body: { error: "taskId is required" } };
    }

    // Validate task exists and get its details for the event payload
    let task;
    try {
      task = this.taskService.getTask(data.taskId);
    } catch {
      return {
        status: 404,
        body: { error: `Task "${data.taskId}" not found` },
      };
    }

    // Validate author exists
    if (!data.authorId || !this.userService.exists(data.authorId)) {
      return {
        status: 404,
        body: { error: `User "${data.authorId ?? ""}" not found` },
      };
    }

    const comment = this.commentService.createComment({
      taskId: data.taskId,
      authorId: data.authorId,
      body: data.body ?? "",
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });

    return { status: 201, body: comment };
  }

  private getComment(req: ApiRequest): ApiResponse {
    const comment = this.commentService.getComment(req.params.id);
    return { status: 200, body: comment };
  }

  private deleteComment(req: ApiRequest): ApiResponse {
    this.commentService.deleteComment(req.params.id);
    return { status: 200, body: { message: "Comment deleted" } };
  }

  // ── Notification Handlers ──────────────────────────────────────────────────

  private listNotifications(req: ApiRequest): ApiResponse {
    const { userId } = req.query;
    const notifications = userId
      ? this.notificationService.getNotificationsForUser(userId)
      : this.notificationService.getAllNotifications();
    return { status: 200, body: notifications };
  }

  private markNotificationRead(req: ApiRequest): ApiResponse {
    const notification = this.notificationService.markAsRead(req.params.id);
    return { status: 200, body: notification };
  }
}
