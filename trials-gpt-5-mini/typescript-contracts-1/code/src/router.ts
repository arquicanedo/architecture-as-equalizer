import http from "http";
import { parse as parseUrl } from "url";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { IEventBus } from "./types";

export class Router {
  private server: http.Server;
  private eventBus: IEventBus;
  private userService: UserService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private commentService: CommentService;
  private notificationService: NotificationService;

  constructor() {
    this.eventBus = new EventBus();
    this.userService = new UserService();
    this.projectService = new ProjectService();
    this.taskService = new TaskService(this.eventBus);
    this.commentService = new CommentService(this.eventBus);
    this.notificationService = new NotificationService(this.eventBus);

    this.server = http.createServer((req, res) => this.handle(req, res));
  }

  listen(port: number) {
    return new Promise<void>((resolve) => {
      this.server.listen(port, () => resolve());
    });
  }

  close() {
    this.server.close();
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const method = req.method || "GET";
      const parsed = parseUrl(req.url || "", true);
      const pathname = parsed.pathname || "/";
      const query = parsed.query;

      const body = await this.readBody(req);

      // Routing
      // Users
      if (method === "GET" && pathname === "/users") return this.ok(res, this.userService.getAll());
      if (method === "POST" && pathname === "/users") return this.ok(res, this.userService.create(body));
      if (pathname.startsWith("/users/")) {
        const id = pathname.split("/")[2];
        if (method === "GET") return this.ok(res, this.userService.getById(id));
        if (method === "PUT") return this.ok(res, this.userService.update(id, body));
        if (method === "DELETE") return this.noContent(res, () => this.userService.delete(id));
      }

      // Projects
      if (method === "GET" && pathname === "/projects") return this.ok(res, this.projectService.getAll());
      if (method === "POST" && pathname === "/projects") return this.ok(res, this.projectService.create(body));
      if (pathname.startsWith("/projects/")) {
        const parts = pathname.split("/");
        const id = parts[2];
        if (parts.length === 3) {
          if (method === "GET") return this.ok(res, this.projectService.getById(id));
          if (method === "PUT") return this.ok(res, this.projectService.update(id, body));
          if (method === "DELETE") return this.noContent(res, () => this.projectService.delete(id));
        }
        if (parts.length === 4 && parts[3] === "members") {
          if (method === "POST") return this.ok(res, this.projectService.addMember(id, body.userId));
          if (method === "DELETE") return this.ok(res, this.projectService.removeMember(id, body.userId));
        }
      }

      // Tasks
      if (method === "GET" && pathname === "/tasks" && query.projectId) return this.ok(res, this.taskService.getByProject(String(query.projectId)));
      if (method === "POST" && pathname === "/tasks") return this.ok(res, this.taskService.create(body));
      if (pathname.startsWith("/tasks/")) {
        const parts = pathname.split("/");
        const id = parts[2];
        if (parts.length === 3) {
          if (method === "GET") return this.ok(res, this.taskService.getById(id));
          if (method === "PUT") return this.ok(res, this.taskService.update(id, body));
          if (method === "DELETE") return this.noContent(res, () => this.taskService.delete(id));
        }
        if (parts.length === 4 && parts[3] === "status" && method === "PUT") return this.ok(res, this.taskService.changeStatus(id, body.status));
        if (parts.length === 4 && parts[3] === "assign" && method === "PUT") return this.ok(res, this.taskService.assign(id, body.assigneeId));
      }

      // Comments
      if (method === "GET" && pathname === "/comments" && query.taskId) return this.ok(res, this.commentService.getByTask(String(query.taskId)));
      if (method === "POST" && pathname === "/comments") {
        const comment = this.commentService.create(body);
        // Enrich comment.added event with taskTitle and authorName and assigneeId if possible by reading task and user services
        // Need to access task and user stores via services here
        // We'll manually publish an enriched event
        const task = (() => {
          try { return this.taskService.getById(comment.taskId); } catch { return null; }
        })();
        const author = (() => {
          try { return this.userService.getById(comment.authorId); } catch { return null; }
        })();
        const enriched: any = { commentId: comment.id, taskId: comment.taskId, taskTitle: task?.title || "", authorId: comment.authorId, authorName: author?.name || "" };
        if (task?.assigneeId) enriched.assigneeId = task.assigneeId;
        this.eventBus.publish("comment.added", enriched);
        return this.ok(res, comment);
      }
      if (pathname.startsWith("/comments/")) {
        const id = pathname.split("/")[2];
        if (method === "GET") return this.ok(res, this.commentService.getById(id));
        if (method === "DELETE") return this.noContent(res, () => this.commentService.delete(id));
      }

      // Notifications
      if (method === "GET" && pathname === "/notifications" && query.userId) return this.ok(res, this.notificationService.getByUser(String(query.userId)));
      if (pathname.startsWith("/notifications/")) {
        const parts = pathname.split("/");
        const id = parts[2];
        if (parts.length === 4 && parts[3] === "read" && method === "PUT") return this.ok(res, this.notificationService.markAsRead(id));
      }

      this.notFound(res);
    } catch (err: any) {
      this.error(res, err);
    }
  }

  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(Buffer.from(c)));
      req.on("end", () => {
        if (chunks.length === 0) return resolve({});
        try {
          const s = Buffer.concat(chunks).toString();
          const obj = JSON.parse(s);
          resolve(obj);
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", (e) => reject(e));
    });
  }

  private ok(res: http.ServerResponse, data: unknown) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  private noContent(res: http.ServerResponse, fn: () => void) {
    fn();
    res.writeHead(204);
    res.end();
  }

  private notFound(res: http.ServerResponse) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  private error(res: http.ServerResponse, err: any) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
