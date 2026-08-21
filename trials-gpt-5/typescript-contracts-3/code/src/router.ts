import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  IUserService,
  IProjectService,
  ITaskService,
  ICommentService,
  INotificationService,
  Task,
  Comment,
  Notification,
} from "./types";

export interface RouterDeps {
  userService: IUserService;
  projectService: IProjectService;
  taskService: ITaskService;
  commentService: ICommentService;
  notificationService: INotificationService;
}

export function startServer(port: number, deps: RouterDeps) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Basic CORS and JSON headers
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "", `http://${req.headers.host}`);

    try {
      const { method } = req;
      const path = url.pathname;
      const send = (code: number, body: unknown) => {
        res.statusCode = code;
        res.end(JSON.stringify(body));
      };

      // Helper to read JSON body
      const readBody = async <T>(): Promise<T> => {
        return new Promise((resolve, reject) => {
          let data = "";
          req.on("data", (chunk) => (data += chunk));
          req.on("end", () => {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch (err) {
              reject(new Error("Invalid JSON"));
            }
          });
          req.on("error", reject);
        });
      };

      // Users
      if (method === "GET" && path === "/users") {
        return send(200, deps.userService.getAll());
      }
      if (method === "POST" && path === "/users") {
        const body = await readBody<{ name: string; email: string }>();
        const u = deps.userService.create(body);
        return send(201, u);
      }
      if (method === "GET" && path.startsWith("/users/")) {
        const id = path.split("/")[2];
        return send(200, deps.userService.getById(id));
      }
      if (method === "PUT" && path.startsWith("/users/")) {
        const id = path.split("/")[2];
        const body = await readBody<Partial<{ name: string; email: string }>>();
        return send(200, deps.userService.update(id, body));
      }
      if (method === "DELETE" && path.startsWith("/users/")) {
        const id = path.split("/")[2];
        deps.userService.delete(id);
        return send(204, {});
      }

      // Projects
      if (method === "GET" && path === "/projects") {
        return send(200, deps.projectService.getAll());
      }
      if (method === "POST" && path === "/projects") {
        const body = await readBody<{ name: string; description: string }>();
        return send(201, deps.projectService.create(body));
      }
      if (method === "GET" && path.startsWith("/projects/") && !path.endsWith("/members")) {
        const id = path.split("/")[2];
        return send(200, deps.projectService.getById(id));
      }
      if (method === "PUT" && path.startsWith("/projects/") && !path.endsWith("/members")) {
        const id = path.split("/")[2];
        const body = await readBody<Partial<{ name: string; description: string }>>();
        return send(200, deps.projectService.update(id, body));
      }
      if (method === "DELETE" && path.startsWith("/projects/") && !path.endsWith("/members")) {
        const id = path.split("/")[2];
        deps.projectService.delete(id);
        return send(204, {});
      }
      if (method === "POST" && path.endsWith("/members")) {
        const id = path.split("/")[2];
        const body = await readBody<{ userId: string }>();
        return send(200, deps.projectService.addMember(id, body.userId));
      }
      if (method === "DELETE" && path.endsWith("/members")) {
        const id = path.split("/")[2];
        const body = await readBody<{ userId: string }>();
        return send(200, deps.projectService.removeMember(id, body.userId));
      }

      // Tasks
      if (method === "GET" && path === "/tasks") {
        const projectId = url.searchParams.get("projectId");
        if (!projectId) throw new Error("projectId query param is required");
        return send(200, deps.taskService.getByProject(projectId));
      }
      if (method === "POST" && path === "/tasks") {
        const body = await readBody<{ title: string; description: string; projectId: string }>();
        return send(201, deps.taskService.create(body));
      }
      if (method === "GET" && path.startsWith("/tasks/")) {
        const id = path.split("/")[2];
        return send(200, deps.taskService.getById(id));
      }
      if (method === "PUT" && path.startsWith("/tasks/") && !path.endsWith("/status") && !path.endsWith("/assign")) {
        const id = path.split("/")[2];
        const body = await readBody<Partial<{ title: string; description: string }>>();
        return send(200, deps.taskService.update(id, body));
      }
      if (method === "DELETE" && path.startsWith("/tasks/") && !path.endsWith("/status") && !path.endsWith("/assign")) {
        const id = path.split("/")[2];
        deps.taskService.delete(id);
        return send(204, {});
      }
      if (method === "PUT" && path.endsWith("/status")) {
        const id = path.split("/")[2];
        const body = await readBody<{ status: Task["status"] }>();
        return send(200, deps.taskService.changeStatus(id, body.status));
      }
      if (method === "PUT" && path.endsWith("/assign")) {
        const id = path.split("/")[2];
        const body = await readBody<{ assigneeId: string }>();
        return send(200, deps.taskService.assign(id, body.assigneeId));
      }

      // Comments
      if (method === "GET" && path === "/comments") {
        const taskId = url.searchParams.get("taskId");
        if (!taskId) throw new Error("taskId query param is required");
        return send(200, deps.commentService.getByTask(taskId));
      }
      if (method === "POST" && path === "/comments") {
        const body = await readBody<{ taskId: string; authorId: string; body: string }>();
        const c = deps.commentService.create(body);
        // enhancement: we could enrich event payloads elsewhere
        return send(201, c);
      }
      if (method === "GET" && path.startsWith("/comments/")) {
        const id = path.split("/")[2];
        return send(200, deps.commentService.getById(id));
      }
      if (method === "DELETE" && path.startsWith("/comments/")) {
        const id = path.split("/")[2];
        deps.commentService.delete(id);
        return send(204, {});
      }

      // Notifications
      if (method === "GET" && path === "/notifications") {
        const userId = url.searchParams.get("userId");
        if (!userId) throw new Error("userId query param is required");
        return send(200, deps.notificationService.getByUser(userId));
      }
      if (method === "PUT" && path.startsWith("/notifications/") && path.endsWith("/read")) {
        const id = path.split("/")[2];
        return send(200, deps.notificationService.markAsRead(id));
      }

      // Fallback
      send(404, { error: "Not found" });
    } catch (err: any) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: err.message || String(err) }));
    }
  });

  server.listen(port);
  return server;
}
