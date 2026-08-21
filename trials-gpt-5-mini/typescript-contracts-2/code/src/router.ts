import * as http from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

function json(res: any, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on("data", (c: any) => chunks.push(c));
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        const s = Buffer.concat(chunks).toString();
        resolve(s ? JSON.parse(s) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function createRouter() {
  const bus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(bus);
  const commentService = new CommentService(bus);
  const notificationService = new NotificationService(bus);

  // Enrich comment.added events with task title, assigneeId and authorName by subscribing here
  bus.subscribe("comment.added", (payload) => {
    const p: any = payload || {};
    try {
      // If payload is already enriched, avoid infinite loop by checking a flag
      if (p._enriched) return;
      const task = taskService.getById(p.taskId);
      const author = userService.getById(p.authorId);
      const enriched = { ...p, taskTitle: task.title, authorName: author.name, assigneeId: task.assigneeId, _enriched: true };
      // re-publish enriched payload to same event so notification service can consume enriched
      bus.publish("comment.added", enriched);
    } catch (e) {
      // ignore enrichment failures
    }
  });

  const server = http.createServer(async (req: any, res: any) => {
    const rawUrl = req.url || "/";
    const host = req.headers && (req.headers.host || "localhost");
    const parsed = new URL(rawUrl, `http://${host}`);
    const pathname = parsed.pathname;
    const method = (req.method || "GET").toUpperCase();

    try {
      // USERS
      if (pathname === "/users" && method === "GET") return json(res, 200, userService.getAll());
      if (pathname === "/users" && method === "POST") {
        const body = await parseBody(req);
        const u = userService.create(body);
        return json(res, 201, u);
      }
      if (pathname && pathname.startsWith("/users/") && method === "GET") {
        const id = pathname.split("/")[2];
        return json(res, 200, userService.getById(id));
      }
      if (pathname && pathname.startsWith("/users/") && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = await parseBody(req);
        return json(res, 200, userService.update(id, body));
      }
      if (pathname && pathname.startsWith("/users/") && method === "DELETE") {
        const id = pathname.split("/")[2];
        userService.delete(id);
        return json(res, 204, {});
      }

      // PROJECTS
      if (pathname === "/projects" && method === "GET") return json(res, 200, projectService.getAll());
      if (pathname === "/projects" && method === "POST") {
        const body = await parseBody(req);
        const p = projectService.create(body);
        return json(res, 201, p);
      }
      if (pathname && pathname.startsWith("/projects/") && method === "GET") {
        const id = pathname.split("/")[2];
        return json(res, 200, projectService.getById(id));
      }
      if (pathname && pathname.startsWith("/projects/") && method === "PUT") {
        const id = pathname.split("/")[2];
        const body = await parseBody(req);
        return json(res, 200, projectService.update(id, body));
      }
      if (pathname && pathname.startsWith("/projects/") && method === "DELETE") {
        const id = pathname.split("/")[2];
        projectService.delete(id);
        return json(res, 204, {});
      }
      if (pathname && /^\/projects\/[^\/]+\/members$/.test(pathname) && method === "POST") {
        const id = pathname.split("/")[2];
        const body = await parseBody(req);
        return json(res, 200, projectService.addMember(id, body.userId));
      }
      if (pathname && /^\/projects\/[^\/]+\/members$/.test(pathname) && method === "DELETE") {
        const id = pathname.split("/")[2];
        const body = await parseBody(req);
        return json(res, 200, projectService.removeMember(id, body.userId));
      }

      // TASKS
      if (pathname === "/tasks" && method === "GET") {
        const projectId = parsed.searchParams.get("projectId");
        if (!projectId) return json(res, 400, { error: "projectId required" });
        return json(res, 200, taskService.getByProject(projectId));
      }
      if (pathname === "/tasks" && method === "POST") {
        const body = await parseBody(req);
        const t = taskService.create(body);
        return json(res, 201, t);
      }
      if (pathname && pathname.startsWith("/tasks/") && method === "GET") {
        const id = pathname.split("/")[2];
        return json(res, 200, taskService.getById(id));
      }
      if (pathname && pathname.startsWith("/tasks/") && method === "PUT") {
        const parts = pathname.split("/");
        const id = parts[2];
        if (parts[3] === "status") {
          const body = await parseBody(req);
          return json(res, 200, taskService.changeStatus(id, body.status));
        } else if (parts[3] === "assign") {
          const body = await parseBody(req);
          return json(res, 200, taskService.assign(id, body.assigneeId));
        } else {
          const body = await parseBody(req);
          return json(res, 200, taskService.update(id, body));
        }
      }
      if (pathname && pathname.startsWith("/tasks/") && method === "DELETE") {
        const id = pathname.split("/")[2];
        taskService.delete(id);
        return json(res, 204, {});
      }

      // COMMENTS
      if (pathname === "/comments" && method === "GET") {
        const taskId = parsed.searchParams.get("taskId");
        if (!taskId) return json(res, 400, { error: "taskId required" });
        return json(res, 200, commentService.getByTask(taskId));
      }
      if (pathname === "/comments" && method === "POST") {
        const body = await parseBody(req);
        const c = commentService.create(body);
        return json(res, 201, c);
      }
      if (pathname && pathname.startsWith("/comments/") && method === "GET") {
        const id = pathname.split("/")[2];
        return json(res, 200, commentService.getById(id));
      }
      if (pathname && pathname.startsWith("/comments/") && method === "DELETE") {
        const id = pathname.split("/")[2];
        commentService.delete(id);
        return json(res, 204, {});
      }

      // NOTIFICATIONS
      if (pathname === "/notifications" && method === "GET") {
        const userId = parsed.searchParams.get("userId");
        if (!userId) return json(res, 400, { error: "userId required" });
        return json(res, 200, notificationService.getByUser(userId));
      }
      if (pathname && /^\/notifications\/[^\/]+\/read$/.test(pathname) && method === "PUT") {
        const id = pathname.split("/")[2];
        return json(res, 200, notificationService.markAsRead(id));
      }

      json(res, 404, { error: "Not found" });
    } catch (e: any) {
      json(res, 400, { error: e.message || String(e) });
    }
  });

  return server;
}
