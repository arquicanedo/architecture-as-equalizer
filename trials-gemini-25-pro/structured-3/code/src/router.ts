import http from "http";
import { URL } from "url";

import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService, TaskStatus } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";

// Service Instantiation
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService(taskService, userService);
const notificationService = new NotificationService(taskService);

async function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        // Handle empty body
        if (body.length === 0) {
          return resolve({});
        }
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendResponse(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export const router = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const method = req.method?.toUpperCase();
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname;
  const parts = path.split("/").filter(Boolean);

  try {
    // USERS
    if (parts[0] === "users") {
      if (parts.length === 1 && method === "GET") {
        return sendResponse(res, 200, userService.getAll());
      }
      if (parts.length === 1 && method === "POST") {
        const { name, email } = await parseJsonBody(req);
        return sendResponse(res, 201, userService.create(name, email));
      }
      if (parts.length === 2 && method === "GET") {
        return sendResponse(res, 200, userService.getById(parts[1]));
      }
      if (parts.length === 2 && method === "PUT") {
        const { name, email } = await parseJsonBody(req);
        return sendResponse(res, 200, userService.update(parts[1], name, email));
      }
      if (parts.length === 2 && method === "DELETE") {
        return sendResponse(res, 200, { success: userService.delete(parts[1]) });
      }
    }

    // PROJECTS
    if (parts[0] === "projects") {
        if (parts.length === 1 && method === "GET") {
            return sendResponse(res, 200, projectService.getAll());
        }
        if (parts.length === 1 && method === "POST") {
            const { name, description } = await parseJsonBody(req);
            return sendResponse(res, 201, projectService.create(name, description));
        }
        if (parts.length === 2 && method === "GET") {
            return sendResponse(res, 200, projectService.getById(parts[1]));
        }
        if (parts.length === 2 && method === "PUT") {
            const { name, description } = await parseJsonBody(req);
            return sendResponse(res, 200, projectService.update(parts[1], name, description));
        }
        if (parts.length === 2 && method === "DELETE") {
            return sendResponse(res, 200, { success: projectService.delete(parts[1]) });
        }
        if (parts.length === 3 && parts[2] === "members" && method === "POST") {
            const { memberId } = await parseJsonBody(req);
            return sendResponse(res, 201, projectService.addMember(parts[1], memberId));
        }
        if (parts.length === 3 && parts[2] === "members" && method === "DELETE") {
            const { memberId } = await parseJsonBody(req);
            return sendResponse(res, 200, projectService.removeMember(parts[1], memberId));
        }
    }

    // TASKS
    if (parts[0] === "tasks") {
        if (method === "GET" && url.searchParams.has("projectId")) {
            const projectId = url.searchParams.get("projectId")!;
            return sendResponse(res, 200, taskService.getByProject(projectId));
        }
        if (parts.length === 1 && method === "POST") {
            const { title, description, projectId } = await parseJsonBody(req);
            return sendResponse(res, 201, taskService.create(title, description, projectId));
        }
        if (parts.length === 2 && method === "GET") {
            return sendResponse(res, 200, taskService.getById(parts[1]));
        }
        if (parts.length === 2 && method === "PUT") {
            const { title, description } = await parseJsonBody(req);
            return sendResponse(res, 200, taskService.update(parts[1], title, description));
        }
        if (parts.length === 2 && method === "DELETE") {
            return sendResponse(res, 200, { success: taskService.delete(parts[1]) });
        }
        if (parts.length === 3 && parts[2] === "status" && method === "PUT") {
            const { status } = await parseJsonBody(req);
            return sendResponse(res, 200, taskService.changeStatus(parts[1], status as TaskStatus));
        }
        if (parts.length === 3 && parts[2] === "assign" && method === "PUT") {
            const { assigneeId } = await parseJsonBody(req);
            return sendResponse(res, 200, taskService.assign(parts[1], assigneeId));
        }
    }

    // COMMENTS
    if (parts[0] === "comments") {
        if (method === "GET" && url.searchParams.has("taskId")) {
            const taskId = url.searchParams.get("taskId")!;
            return sendResponse(res, 200, commentService.getByTask(taskId));
        }
        if (parts.length === 1 && method === "POST") {
            const { taskId, authorId, body } = await parseJsonBody(req);
            return sendResponse(res, 201, commentService.create(taskId, authorId, body));
        }
        if (parts.length === 2 && method === "GET") {
            return sendResponse(res, 200, commentService.getById(parts[1]));
        }
        if (parts.length === 2 && method === "DELETE") {
            return sendResponse(res, 200, { success: commentService.delete(parts[1]) });
        }
    }

    // NOTIFICATIONS
    if (parts[0] === "notifications") {
        if (method === "GET" && url.searchParams.has("userId")) {
            const userId = url.searchParams.get("userId")!;
            return sendResponse(res, 200, notificationService.getByUser(userId));
        }
        if (parts.length === 3 && parts[2] === "read" && method === "PUT") {
            return sendResponse(res, 200, notificationService.markAsRead(parts[1]));
        }
    }

    return sendResponse(res, 404, { error: "Not Found" });
  } catch (error) {
    console.error("Error in router:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    sendResponse(res, 500, { error: message });
  }
};
