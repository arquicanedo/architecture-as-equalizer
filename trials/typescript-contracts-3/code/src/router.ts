// ============================================================
// API Router — HTTP handling only (RULE 3)
// ============================================================

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

import { userService } from "./services/user-service";
import { projectService } from "./services/project-service";
import { taskService } from "./services/task-service";
import { commentService } from "./services/comment-service";
import { notificationService } from "./services/notification-service";
import { TaskStatus } from "./event-bus";

// ---- Helpers ------------------------------------------------

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
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

function send(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  send(res, status, { error: message });
}

/** Parse the pathname and search params from a raw request URL */
function parseUrl(req: IncomingMessage): { pathname: string; searchParams: URLSearchParams } {
  const base = `http://localhost`;
  const parsed = new URL(req.url ?? "/", base);
  return { pathname: parsed.pathname, searchParams: parsed.searchParams };
}

/**
 * Match a pathname against a pattern like "/users/:id" or "/projects/:id/members".
 * Returns the extracted params object or null if the pattern does not match.
 */
function matchPath(
  pattern: string,
  pathname: string
): Record<string, string> | null {
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
  return params;
}

// ---- Route handler ------------------------------------------

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = req.method?.toUpperCase() ?? "GET";
  const { pathname, searchParams } = parseUrl(req);

  try {
    // ---- Users ----------------------------------------------

    if (method === "GET" && matchPath("/users", pathname)) {
      return send(res, 200, userService.getAll());
    }

    if (method === "POST" && matchPath("/users", pathname)) {
      const body = (await readBody(req)) as { name: string; email: string };
      const user = userService.create(body);
      return send(res, 201, user);
    }

    const userMatch = matchPath("/users/:id", pathname);

    if (userMatch) {
      const { id } = userMatch;

      if (method === "GET") {
        return send(res, 200, userService.getById(id));
      }

      if (method === "PUT") {
        const body = (await readBody(req)) as Partial<{ name: string; email: string }>;
        return send(res, 200, userService.update(id, body));
      }

      if (method === "DELETE") {
        userService.delete(id);
        return send(res, 204, null);
      }
    }

    // ---- Projects -------------------------------------------

    if (method === "GET" && matchPath("/projects", pathname)) {
      return send(res, 200, projectService.getAll());
    }

    if (method === "POST" && matchPath("/projects", pathname)) {
      const body = (await readBody(req)) as { name: string; description: string };
      const project = projectService.create(body);
      return send(res, 201, project);
    }

    const projectMatch = matchPath("/projects/:id", pathname);

    if (projectMatch) {
      const { id } = projectMatch;

      if (method === "GET") {
        return send(res, 200, projectService.getById(id));
      }

      if (method === "PUT") {
        const body = (await readBody(req)) as Partial<{ name: string; description: string }>;
        return send(res, 200, projectService.update(id, body));
      }

      if (method === "DELETE") {
        projectService.delete(id);
        return send(res, 204, null);
      }
    }

    const projectMembersMatch = matchPath("/projects/:id/members", pathname);

    if (projectMembersMatch) {
      const { id } = projectMembersMatch;

      if (method === "POST") {
        const body = (await readBody(req)) as { userId: string };
        return send(res, 200, projectService.addMember(id, body.userId));
      }

      if (method === "DELETE") {
        const body = (await readBody(req)) as { userId: string };
        return send(res, 200, projectService.removeMember(id, body.userId));
      }
    }

    // ---- Tasks ----------------------------------------------

    if (method === "GET" && matchPath("/tasks", pathname)) {
      const projectId = searchParams.get("projectId");
      if (!projectId) {
        return sendError(res, 400, "Query param 'projectId' is required");
      }
      return send(res, 200, taskService.getByProject(projectId));
    }

    if (method === "POST" && matchPath("/tasks", pathname)) {
      const body = (await readBody(req)) as {
        title: string;
        description: string;
        projectId: string;
      };
      const task = taskService.create(body);
      return send(res, 201, task);
    }

    const taskMatch = matchPath("/tasks/:id", pathname);

    if (taskMatch) {
      const { id } = taskMatch;

      if (method === "GET") {
        return send(res, 200, taskService.getById(id));
      }

      if (method === "PUT") {
        const body = (await readBody(req)) as Partial<{ title: string; description: string }>;
        return send(res, 200, taskService.update(id, body));
      }

      if (method === "DELETE") {
        taskService.delete(id);
        return send(res, 204, null);
      }
    }

    const taskStatusMatch = matchPath("/tasks/:id/status", pathname);

    if (taskStatusMatch && method === "PUT") {
      const { id } = taskStatusMatch;
      const body = (await readBody(req)) as { status: TaskStatus };
      return send(res, 200, taskService.changeStatus(id, body.status));
    }

    const taskAssignMatch = matchPath("/tasks/:id/assign", pathname);

    if (taskAssignMatch && method === "PUT") {
      const { id } = taskAssignMatch;
      const body = (await readBody(req)) as { assigneeId: string };
      return send(res, 200, taskService.assign(id, body.assigneeId));
    }

    // ---- Comments -------------------------------------------

    if (method === "GET" && matchPath("/comments", pathname)) {
      const taskId = searchParams.get("taskId");
      if (!taskId) {
        return sendError(res, 400, "Query param 'taskId' is required");
      }
      return send(res, 200, commentService.getByTask(taskId));
    }

    if (method === "POST" && matchPath("/comments", pathname)) {
      const body = (await readBody(req)) as {
        taskId: string;
        authorId: string;
        body: string;
      };

      // Resolve context needed for event payload (RULE 1: no cross-service imports in services)
      const task = taskService.getById(body.taskId);
      const author = userService.getById(body.authorId);

      const comment = commentService.create({
        taskId: body.taskId,
        authorId: body.authorId,
        body: body.body,
        taskTitle: task.title,
        authorName: author.name,
        assigneeId: task.assigneeId,
      });
      return send(res, 201, comment);
    }

    const commentMatch = matchPath("/comments/:id", pathname);

    if (commentMatch) {
      const { id } = commentMatch;

      if (method === "GET") {
        return send(res, 200, commentService.getById(id));
      }

      if (method === "DELETE") {
        commentService.delete(id);
        return send(res, 204, null);
      }
    }

    // ---- Notifications --------------------------------------

    if (method === "GET" && matchPath("/notifications", pathname)) {
      const userId = searchParams.get("userId");
      if (!userId) {
        return sendError(res, 400, "Query param 'userId' is required");
      }
      return send(res, 200, notificationService.getByUser(userId));
    }

    const notificationReadMatch = matchPath("/notifications/:id/read", pathname);

    if (notificationReadMatch && method === "PUT") {
      const { id } = notificationReadMatch;
      return send(res, 200, notificationService.markAsRead(id));
    }

    // ---- 404 ------------------------------------------------

    sendError(res, 404, `Route not found: ${method} ${pathname}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    // Not-found type errors → 404; state machine errors → 422; otherwise → 500
    if (message.includes("not found")) {
      sendError(res, 404, message);
    } else if (message.includes("Invalid status transition")) {
      sendError(res, 422, message);
    } else {
      sendError(res, 500, message);
    }
  }
}
