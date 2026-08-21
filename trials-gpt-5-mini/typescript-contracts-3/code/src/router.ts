import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse as parseUrl } from "url";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { EventBus } from "./event-bus";
import { IEventBus } from "./types";

function jsonResponse(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

async function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        const str = Buffer.concat(chunks).toString();
        resolve(JSON.parse(str));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function createRouter() {
  const eventBus: IEventBus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService();

  // Wire events: main() will rewire in main.ts, but router also can be used standalone. For simplicity, expose services and eventBus via closure return.

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = parseUrl(req.url || "", true);
      const method = req.method || "GET";
      const path = url.pathname || "/";

      // Routing
      if (method === "GET" && path === "/users") {
        return jsonResponse(res, 200, userService.getAll());
      }
      if (method === "POST" && path === "/users") {
        const body = await readJson(req);
        const u = userService.create(body);
        return jsonResponse(res, 201, u);
      }
      if (method === "GET" && path?.startsWith("/users/")) {
        const id = path.split("/")[2];
        return jsonResponse(res, 200, userService.getById(id));
      }
      if (method === "PUT" && path?.startsWith("/users/")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        return jsonResponse(res, 200, userService.update(id, body));
      }
      if (method === "DELETE" && path?.startsWith("/users/")) {
        const id = path.split("/")[2];
        userService.delete(id);
        return jsonResponse(res, 204, null);
      }

      // Projects
      if (method === "GET" && path === "/projects") {
        return jsonResponse(res, 200, projectService.getAll());
      }
      if (method === "POST" && path === "/projects") {
        const body = await readJson(req);
        const p = projectService.create(body);
        return jsonResponse(res, 201, p);
      }
      if (method === "GET" && path?.startsWith("/projects/")) {
        const id = path.split("/")[2];
        return jsonResponse(res, 200, projectService.getById(id));
      }
      if (method === "PUT" && path?.startsWith("/projects/")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        return jsonResponse(res, 200, projectService.update(id, body));
      }
      if (method === "DELETE" && path?.startsWith("/projects/")) {
        const id = path.split("/")[2];
        projectService.delete(id);
        return jsonResponse(res, 204, null);
      }
      if (method === "POST" && path?.endsWith("/members")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        const p = projectService.addMember(id, body.userId);
        return jsonResponse(res, 200, p);
      }
      if (method === "DELETE" && path?.endsWith("/members")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        const p = projectService.removeMember(id, body.userId);
        return jsonResponse(res, 200, p);
      }

      // Tasks
      if (method === "GET" && path === "/tasks") {
        const projectId = url.query.projectId as string | undefined;
        if (!projectId) return jsonResponse(res, 400, { error: "projectId required" });
        return jsonResponse(res, 200, taskService.getByProject(projectId));
      }
      if (method === "POST" && path === "/tasks") {
        const body = await readJson(req);
        const t = taskService.create(body);
        return jsonResponse(res, 201, t);
      }
      if (method === "GET" && path?.startsWith("/tasks/")) {
        const id = path.split("/")[2];
        return jsonResponse(res, 200, taskService.getById(id));
      }
      if (method === "PUT" && /^\/tasks\/[^/]+$/.test(path || "")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        return jsonResponse(res, 200, taskService.update(id, body));
      }
      if (method === "DELETE" && path?.startsWith("/tasks/")) {
        const id = path.split("/")[2];
        taskService.delete(id);
        return jsonResponse(res, 204, null);
      }
      if (method === "PUT" && path?.endsWith("/status")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        const t = taskService.changeStatus(id, body.status);
        return jsonResponse(res, 200, t);
      }
      if (method === "PUT" && path?.endsWith("/assign")) {
        const id = path.split("/")[2];
        const body = await readJson(req);
        const t = taskService.assign(id, body.assigneeId);
        return jsonResponse(res, 200, t);
      }

      // Comments
      if (method === "GET" && path === "/comments") {
        const taskId = url.query.taskId as string | undefined;
        if (!taskId) return jsonResponse(res, 400, { error: "taskId required" });
        return jsonResponse(res, 200, commentService.getByTask(taskId));
      }
      if (method === "POST" && path === "/comments") {
        const body = await readJson(req);
        const c = commentService.create(body);
        return jsonResponse(res, 201, c);
      }
      if (method === "GET" && path?.startsWith("/comments/")) {
        const id = path.split("/")[2];
        return jsonResponse(res, 200, commentService.getById(id));
      }
      if (method === "DELETE" && path?.startsWith("/comments/")) {
        const id = path.split("/")[2];
        commentService.delete(id);
        return jsonResponse(res, 204, null);
      }

      // Notifications
      if (method === "GET" && path === "/notifications") {
        const userId = url.query.userId as string | undefined;
        if (!userId) return jsonResponse(res, 400, { error: "userId required" });
        return jsonResponse(res, 200, notificationService.getByUser(userId));
      }
      if (method === "PUT" && path?.endsWith("/read")) {
        const id = path.split("/")[2];
        const n = notificationService.markAsRead(id);
        return jsonResponse(res, 200, n);
      }

      jsonResponse(res, 404, { error: "Not found" });
    } catch (e: any) {
      jsonResponse(res, 500, { error: e.message || String(e) });
    }
  });

  return { server, services: { userService, projectService, taskService, commentService, notificationService }, eventBus };
}
