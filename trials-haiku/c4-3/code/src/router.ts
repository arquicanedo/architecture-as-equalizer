/**
 * API Router
 * HTTP entry point that delegates to services
 */

import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { userService, CreateUserRequest } from "./services/user-service";
import { projectService, CreateProjectRequest, UpdateProjectRequest, AddMemberRequest, RemoveMemberRequest } from "./services/project-service";
import { taskService, CreateTaskRequest, UpdateTaskRequest, AssignRequest, ChangeStatusRequest } from "./services/task-service";
import { commentService, CreateCommentRequest } from "./services/comment-service";
import { notificationService } from "./services/notification-service";

type ParsedBody = CreateUserRequest | CreateProjectRequest | UpdateProjectRequest | AddMemberRequest | RemoveMemberRequest | CreateTaskRequest | UpdateTaskRequest | AssignRequest | ChangeStatusRequest | CreateCommentRequest | Record<string, any>;

async function parseRequestBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res: ServerResponse, statusCode: number, message: string): void {
  sendJSON(res, statusCode, { error: message });
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  const method = req.method || "GET";

  try {
    // User routes
    if (pathname === "/users" && method === "GET") {
      const users = userService.getAll();
      sendJSON(res, 200, { users });
      return;
    }

    if (pathname === "/users" && method === "POST") {
      const body = (await parseRequestBody(req)) as CreateUserRequest;
      const user = userService.create(body);
      sendJSON(res, 201, { user });
      return;
    }

    const userMatch = pathname.match(/^\/users\/([a-f0-9\-]+)$/);
    if (userMatch && method === "GET") {
      const user = userService.getById(userMatch[1]);
      if (!user) {
        sendError(res, 404, "User not found");
        return;
      }
      sendJSON(res, 200, { user });
      return;
    }

    if (userMatch && method === "PUT") {
      const body = (await parseRequestBody(req)) as UpdateProjectRequest;
      const user = userService.update(userMatch[1], body);
      if (!user) {
        sendError(res, 404, "User not found");
        return;
      }
      sendJSON(res, 200, { user });
      return;
    }

    if (userMatch && method === "DELETE") {
      const success = userService.delete(userMatch[1]);
      if (!success) {
        sendError(res, 404, "User not found");
        return;
      }
      sendJSON(res, 200, { success: true });
      return;
    }

    // Project routes
    if (pathname === "/projects" && method === "GET") {
      const projects = projectService.getAll();
      sendJSON(res, 200, { projects });
      return;
    }

    if (pathname === "/projects" && method === "POST") {
      const body = (await parseRequestBody(req)) as CreateProjectRequest;
      const project = projectService.create(body);
      sendJSON(res, 201, { project });
      return;
    }

    const projectMatch = pathname.match(/^\/projects\/([a-f0-9\-]+)$/);
    if (projectMatch && method === "GET") {
      const project = projectService.getById(projectMatch[1]);
      if (!project) {
        sendError(res, 404, "Project not found");
        return;
      }
      sendJSON(res, 200, { project });
      return;
    }

    if (projectMatch && method === "PUT") {
      const body = (await parseRequestBody(req)) as UpdateProjectRequest;
      const project = projectService.update(projectMatch[1], body);
      if (!project) {
        sendError(res, 404, "Project not found");
        return;
      }
      sendJSON(res, 200, { project });
      return;
    }

    if (projectMatch && method === "DELETE") {
      const success = projectService.delete(projectMatch[1]);
      if (!success) {
        sendError(res, 404, "Project not found");
        return;
      }
      sendJSON(res, 200, { success: true });
      return;
    }

    // Project member routes
    const projectMemberMatch = pathname.match(
      /^\/projects\/([a-f0-9\-]+)\/members$/
    );
    if (projectMemberMatch && method === "POST") {
      const body = (await parseRequestBody(req)) as AddMemberRequest;
      const project = projectService.addMember(projectMemberMatch[1], body.userId);
      if (!project) {
        sendError(res, 404, "Project not found");
        return;
      }
      sendJSON(res, 200, { project });
      return;
    }

    if (projectMemberMatch && method === "DELETE") {
      const body = (await parseRequestBody(req)) as RemoveMemberRequest;
      const project = projectService.removeMember(projectMemberMatch[1], body.userId);
      if (!project) {
        sendError(res, 404, "Project not found");
        return;
      }
      sendJSON(res, 200, { project });
      return;
    }

    // Task routes
    if (pathname === "/tasks" && method === "GET") {
      const projectId = searchParams.get("projectId");
      const tasks = projectId ? taskService.getByProject(projectId) : [];
      sendJSON(res, 200, { tasks });
      return;
    }

    if (pathname === "/tasks" && method === "POST") {
      const body = (await parseRequestBody(req)) as CreateTaskRequest;
      const task = taskService.create(body);
      sendJSON(res, 201, { task });
      return;
    }

    const taskMatch = pathname.match(/^\/tasks\/([a-f0-9\-]+)$/);
    if (taskMatch && method === "GET") {
      const task = taskService.getById(taskMatch[1]);
      if (!task) {
        sendError(res, 404, "Task not found");
        return;
      }
      sendJSON(res, 200, { task });
      return;
    }

    if (taskMatch && method === "PUT") {
      const body = (await parseRequestBody(req)) as UpdateTaskRequest;
      const task = taskService.update(taskMatch[1], body);
      if (!task) {
        sendError(res, 404, "Task not found");
        return;
      }
      sendJSON(res, 200, { task });
      return;
    }

    if (taskMatch && method === "DELETE") {
      const success = taskService.delete(taskMatch[1]);
      if (!success) {
        sendError(res, 404, "Task not found");
        return;
      }
      sendJSON(res, 200, { success: true });
      return;
    }

    // Task status routes
    const taskStatusMatch = pathname.match(/^\/tasks\/([a-f0-9\-]+)\/status$/);
    if (taskStatusMatch && method === "PUT") {
      const body = (await parseRequestBody(req)) as ChangeStatusRequest;
      const task = taskService.changeStatus(taskStatusMatch[1], body);
      if (!task) {
        sendError(res, 404, "Task not found");
        return;
      }
      sendJSON(res, 200, { task });
      return;
    }

    // Task assign routes
    const taskAssignMatch = pathname.match(/^\/tasks\/([a-f0-9\-]+)\/assign$/);
    if (taskAssignMatch && method === "PUT") {
      const body = (await parseRequestBody(req)) as AssignRequest;
      const task = taskService.assign(taskAssignMatch[1], body);
      if (!task) {
        sendError(res, 404, "Task not found");
        return;
      }
      sendJSON(res, 200, { task });
      return;
    }

    // Comment routes
    if (pathname === "/comments" && method === "GET") {
      const taskId = searchParams.get("taskId");
      const comments = taskId ? commentService.getByTask(taskId) : [];
      sendJSON(res, 200, { comments });
      return;
    }

    if (pathname === "/comments" && method === "POST") {
      const body = (await parseRequestBody(req)) as CreateCommentRequest;
      const comment = commentService.create(body);
      if (!comment) {
        sendError(res, 400, "Invalid task or author");
        return;
      }

      // Notify task assignee on comment
      const task = taskService.getById(body.taskId);
      if (task && task.assigneeId) {
        const author = userService.getById(body.authorId);
        if (author) {
          notificationService.notifyTaskAssigneeOnComment(
            task.assigneeId,
            task.title,
            author.name
          );
        }
      }

      sendJSON(res, 201, { comment });
      return;
    }

    const commentMatch = pathname.match(/^\/comments\/([a-f0-9\-]+)$/);
    if (commentMatch && method === "GET") {
      const comment = commentService.getById(commentMatch[1]);
      if (!comment) {
        sendError(res, 404, "Comment not found");
        return;
      }
      sendJSON(res, 200, { comment });
      return;
    }

    if (commentMatch && method === "DELETE") {
      const success = commentService.delete(commentMatch[1]);
      if (!success) {
        sendError(res, 404, "Comment not found");
        return;
      }
      sendJSON(res, 200, { success: true });
      return;
    }

    // Notification routes
    if (pathname === "/notifications" && method === "GET") {
      const userId = searchParams.get("userId");
      const notifications = userId ? notificationService.getByUser(userId) : [];
      sendJSON(res, 200, { notifications });
      return;
    }

    const notificationMatch = pathname.match(
      /^\/notifications\/([a-f0-9\-]+)\/read$/
    );
    if (notificationMatch && method === "PUT") {
      const notification = notificationService.markAsRead(notificationMatch[1]);
      if (!notification) {
        sendError(res, 404, "Notification not found");
        return;
      }
      sendJSON(res, 200, { notification });
      return;
    }

    // 404
    sendError(res, 404, "Not found");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    sendError(res, 500, message);
  }
}
