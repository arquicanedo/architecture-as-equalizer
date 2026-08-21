import { IncomingMessage, ServerResponse } from "http";
import { parse as parseQuery } from "querystring";
import { URL } from "url";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

export interface Services {
  users: UserService;
  projects: ProjectService;
  tasks: TaskService;
  comments: CommentService;
  notifications: NotificationService;
}

export function createRouter(services: Services) {
  return async function handler(req: IncomingMessage, res: ServerResponse) {
    try {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const method = (req.method || "GET").toUpperCase();
      const path = url.pathname;
      const query = parseQuery(url.searchParams.toString());

      // Helper responders
      const send = (code: number, data: any) => {
        const body = JSON.stringify(data);
        res.statusCode = code;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Length", Buffer.byteLength(body));
        res.end(body);
      };

      const notFound = () => send(404, { error: "Not Found" });

      const readBody = async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw) return {};
        try {
          return JSON.parse(raw);
        } catch (e) {
          throw new Error("Invalid JSON body");
        }
      };

      // Routing
      // Users
      if (method === "GET" && path === "/users") {
        return send(200, services.users.getAll());
      }
      if (method === "POST" && path === "/users") {
        const body = await readBody();
        const user = services.users.create({ name: body.name, email: body.email });
        return send(201, user);
      }
      if (path.startsWith("/users/") && path.split("/").length === 3) {
        const id = path.split("/")[2];
        if (method === "GET") {
          return send(200, services.users.getById(id));
        }
        if (method === "PUT") {
          const body = await readBody();
          return send(200, services.users.update(id, body));
        }
        if (method === "DELETE") {
          services.users.delete(id);
          return send(204, {});
        }
      }

      // Projects
      if (method === "GET" && path === "/projects") {
        return send(200, services.projects.getAll());
      }
      if (method === "POST" && path === "/projects") {
        const body = await readBody();
        const project = services.projects.create({ name: body.name, description: body.description });
        return send(201, project);
      }
      if (path.startsWith("/projects/") && path.split("/").length === 3) {
        const id = path.split("/")[2];
        if (method === "GET") {
          return send(200, services.projects.getById(id));
        }
        if (method === "PUT") {
          const body = await readBody();
          return send(200, services.projects.update(id, body));
        }
        if (method === "DELETE") {
          services.projects.delete(id);
          return send(204, {});
        }
      }
      if (path.startsWith("/projects/") && path.endsWith("/members")) {
        const parts = path.split("/");
        // /projects/:id/members
        const id = parts[2];
        if (method === "POST") {
          const body = await readBody();
          const project = services.projects.addMember(id, body.userId);
          return send(200, project);
        }
        if (method === "DELETE") {
          const body = await readBody();
          const project = services.projects.removeMember(id, body.userId);
          return send(200, project);
        }
      }

      // Tasks
      if (method === "GET" && path === "/tasks") {
        const projectId = (query["projectId"] as string) || url.searchParams.get("projectId");
        if (!projectId) throw new Error("projectId is required");
        return send(200, services.tasks.getByProject(projectId));
      }
      if (method === "POST" && path === "/tasks") {
        const body = await readBody();
        const task = services.tasks.create({ title: body.title, description: body.description, projectId: body.projectId });
        return send(201, task);
      }
      if (path.startsWith("/tasks/") && path.split("/").length === 3) {
        const id = path.split("/")[2];
        if (method === "GET") {
          return send(200, services.tasks.getById(id));
        }
        if (method === "PUT") {
          const body = await readBody();
          const updated = services.tasks.update(id, body);
          return send(200, updated);
        }
        if (method === "DELETE") {
          services.tasks.delete(id);
          return send(204, {});
        }
      }
      if (path.startsWith("/tasks/") && path.endsWith("/status")) {
        const id = path.split("/")[2];
        if (method === "PUT") {
          const body = await readBody();
          const updated = services.tasks.changeStatus(id, body.status);
          return send(200, updated);
        }
      }
      if (path.startsWith("/tasks/") && path.endsWith("/assign")) {
        const id = path.split("/")[2];
        if (method === "PUT") {
          const body = await readBody();
          const updated = services.tasks.assign(id, body.assigneeId);
          return send(200, updated);
        }
      }

      // Comments
      if (method === "GET" && path === "/comments") {
        const taskId = (query["taskId"] as string) || url.searchParams.get("taskId");
        if (!taskId) throw new Error("taskId is required");
        return send(200, services.comments.getByTask(taskId));
      }
      if (method === "POST" && path === "/comments") {
        const body = await readBody();
        const comment = services.comments.create({ taskId: body.taskId, authorId: body.authorId, body: body.body });
        return send(201, comment);
      }
      if (path.startsWith("/comments/") && path.split("/").length === 3) {
        const id = path.split("/")[2];
        if (method === "GET") {
          return send(200, services.comments.getById(id));
        }
        if (method === "DELETE") {
          services.comments.delete(id);
          return send(204, {});
        }
      }

      // Notifications
      if (method === "GET" && path === "/notifications") {
        const userId = (query["userId"] as string) || url.searchParams.get("userId");
        if (!userId) throw new Error("userId is required");
        return send(200, services.notifications.getByUser(userId));
      }
      if (path.startsWith("/notifications/") && path.endsWith("/read")) {
        const id = path.split("/")[2];
        if (method === "PUT") {
          const updated = services.notifications.markAsRead(id);
          return send(200, updated);
        }
      }

      return notFound();
    } catch (err: any) {
      const message = err?.message || "Internal Server Error";
      const status = typeof message === "string" && message.toLowerCase().includes("not found") ? 404 : 400;
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: message }));
    }
  };
}
