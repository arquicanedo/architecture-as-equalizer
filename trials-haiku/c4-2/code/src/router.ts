/**
 * API Router
 * HTTP entry point, delegates to services
 */

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { userService } from "./services/user-service.js";
import { projectService } from "./services/project-service.js";
import { taskService } from "./services/task-service.js";
import { commentService } from "./services/comment-service.js";
import { notificationService } from "./services/notification-service.js";

/**
 * Parse JSON body from request
 */
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: any
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, message: string) {
  sendJson(res, statusCode, { error: message });
}

/**
 * Main router handler
 */
export async function router(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || "GET";
  const searchParams = url.searchParams;

  const body = ["POST", "PUT", "PATCH"].includes(method)
    ? await parseBody(req)
    : {};

  try {
    // User routes
    if (pathname === "/users" && method === "GET") {
      const users = userService.getAll();
      return sendJson(res, 200, users);
    }

    if (pathname === "/users" && method === "POST") {
      const user = userService.create(body);
      return sendJson(res, 201, user);
    }

    const userIdMatch = pathname.match(/^\/users\/([^/]+)$/);
    if (userIdMatch && method === "GET") {
      const user = userService.getById(userIdMatch[1]);
      if (!user) return sendError(res, 404, "User not found");
      return sendJson(res, 200, user);
    }

    if (userIdMatch && method === "PUT") {
      const user = userService.update(userIdMatch[1], body);
      if (!user) return sendError(res, 404, "User not found");
      return sendJson(res, 200, user);
    }

    if (userIdMatch && method === "DELETE") {
      const deleted = userService.delete(userIdMatch[1]);
      if (!deleted) return sendError(res, 404, "User not found");
      return sendJson(res, 204, null);
    }

    // Project routes
    if (pathname === "/projects" && method === "GET") {
      const projects = projectService.getAll();
      return sendJson(res, 200, projects);
    }

    if (pathname === "/projects" && method === "POST") {
      const project = projectService.create(body);
      return sendJson(res, 201, project);
    }

    const projectIdMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectIdMatch && method === "GET") {
      const project = projectService.getById(projectIdMatch[1]);
      if (!project) return sendError(res, 404, "Project not found");
      return sendJson(res, 200, project);
    }

    if (projectIdMatch && method === "PUT") {
      const project = projectService.update(projectIdMatch[1], body);
      if (!project) return sendError(res, 404, "Project not found");
      return sendJson(res, 200, project);
    }

    if (projectIdMatch && method === "DELETE") {
      const deleted = projectService.delete(projectIdMatch[1]);
      if (!deleted) return sendError(res, 404, "Project not found");
      return sendJson(res, 204, null);
    }

    // Project members routes
    const memberAddMatch = pathname.match(/^\/projects\/([^/]+)\/members$/);
    if (memberAddMatch && method === "POST") {
      const project = projectService.addMember(
        memberAddMatch[1],
        body.userId
      );
      if (!project) return sendError(res, 404, "Project not found");
      return sendJson(res, 200, project);
    }

    if (memberAddMatch && method === "DELETE") {
      const project = projectService.removeMember(
        memberAddMatch[1],
        body.userId
      );
      if (!project) return sendError(res, 404, "Project not found");
      return sendJson(res, 200, project);
    }

    // Task routes
    if (pathname === "/tasks" && method === "GET") {
      const projectId = searchParams.get("projectId");
      if (projectId) {
        const tasks = taskService.getByProject(projectId);
        return sendJson(res, 200, tasks);
      }
      return sendError(res, 400, "projectId query parameter required");
    }

    if (pathname === "/tasks" && method === "POST") {
      const task = taskService.create(body);
      return sendJson(res, 201, task);
    }

    const taskIdMatch = pathname.match(/^\/tasks\/([^/]+)$/);
    if (taskIdMatch && method === "GET") {
      const task = taskService.getById(taskIdMatch[1]);
      if (!task) return sendError(res, 404, "Task not found");
      return sendJson(res, 200, task);
    }

    if (taskIdMatch && method === "PUT") {
      const task = taskService.update(taskIdMatch[1], body);
      if (!task) return sendError(res, 404, "Task not found");
      return sendJson(res, 200, task);
    }

    if (taskIdMatch && method === "DELETE") {
      const deleted = taskService.delete(taskIdMatch[1]);
      if (!deleted) return sendError(res, 404, "Task not found");
      return sendJson(res, 204, null);
    }

    // Task status route
    const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
    if (taskStatusMatch && method === "PUT") {
      try {
        const task = taskService.changeStatus(taskStatusMatch[1], body);
        if (!task) return sendError(res, 404, "Task not found");
        return sendJson(res, 200, task);
      } catch (error: any) {
        return sendError(res, 400, error.message);
      }
    }

    // Task assign route
    const taskAssignMatch = pathname.match(/^\/tasks\/([^/]+)\/assign$/);
    if (taskAssignMatch && method === "PUT") {
      const task = taskService.assign(taskAssignMatch[1], body.assigneeId);
      if (!task) return sendError(res, 404, "Task not found");
      return sendJson(res, 200, task);
    }

    // Comment routes
    if (pathname === "/comments" && method === "GET") {
      const taskId = searchParams.get("taskId");
      if (taskId) {
        const comments = commentService.getByTask(taskId);
        return sendJson(res, 200, comments);
      }
      return sendError(res, 400, "taskId query parameter required");
    }

    if (pathname === "/comments" && method === "POST") {
      // Verify task exists to get the task title for the event
      const task = taskService.getById(body.taskId);
      if (!task) return sendError(res, 404, "Task not found");

      const comment = commentService.create({
        ...body,
        taskTitle: task.title,
      });
      return sendJson(res, 201, comment);
    }

    const commentIdMatch = pathname.match(/^\/comments\/([^/]+)$/);
    if (commentIdMatch && method === "GET") {
      const comment = commentService.getById(commentIdMatch[1]);
      if (!comment) return sendError(res, 404, "Comment not found");
      return sendJson(res, 200, comment);
    }

    if (commentIdMatch && method === "DELETE") {
      const deleted = commentService.delete(commentIdMatch[1]);
      if (!deleted) return sendError(res, 404, "Comment not found");
      return sendJson(res, 204, null);
    }

    // Notification routes
    if (pathname === "/notifications" && method === "GET") {
      const userId = searchParams.get("userId");
      if (userId) {
        const notifications = notificationService.getByUser(userId);
        return sendJson(res, 200, notifications);
      }
      return sendError(res, 400, "userId query parameter required");
    }

    const notifReadMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
    if (notifReadMatch && method === "PUT") {
      const notification = notificationService.markAsRead(notifReadMatch[1]);
      if (!notification)
        return sendError(res, 404, "Notification not found");
      return sendJson(res, 200, notification);
    }

    // Not found
    sendError(res, 404, "Route not found");
  } catch (error: any) {
    console.error("Router error:", error);
    sendError(res, 500, error.message || "Internal server error");
  }
}
