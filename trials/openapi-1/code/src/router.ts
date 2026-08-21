// ============================================================
// API Router
// Single entry point for all HTTP handling.
// Delegates to services; never touches a service's data store.
// ============================================================

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

import { userService } from './services/user-service.js';
import { projectService } from './services/project-service.js';
import { taskService } from './services/task-service.js';
import { commentService } from './services/comment-service.js';
import { notificationService } from './services/notification-service.js';
import { TaskStatus } from './types.js';

// ---- HTTP helpers -------------------------------------------

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  send(res, status, { error: message });
}

function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

// ---- Route dispatch -----------------------------------------

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const method = req.method ?? 'GET';
  const base = `http://${req.headers.host ?? 'localhost'}`;
  const url = new URL(req.url ?? '/', base);
  const pathname = url.pathname.replace(/\/$/, '') || '/'; // strip trailing slash

  // Split path into segments: /users/abc → ['', 'users', 'abc']
  const segments = pathname.split('/');
  // segments[0] is always ''
  const [, resource, idOrSub, sub] = segments;

  try {
    // ===================== /users ============================
    if (resource === 'users') {
      if (!idOrSub) {
        // GET /users
        if (method === 'GET') {
          const result = userService.listUsers();
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // POST /users
        if (method === 'POST') {
          const body = await readBody(req) as Record<string, unknown>;
          const result = userService.createUser({
            name: String(body.name ?? ''),
            email: String(body.email ?? ''),
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 201, result.data);
        }
      } else {
        const userId = idOrSub;
        // GET /users/:id
        if (method === 'GET' && !sub) {
          const result = userService.getUser(userId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // PUT /users/:id
        if (method === 'PUT' && !sub) {
          const body = await readBody(req) as Record<string, unknown>;
          const result = userService.updateUser(userId, {
            ...(body.name !== undefined ? { name: String(body.name) } : {}),
            ...(body.email !== undefined ? { email: String(body.email) } : {}),
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // DELETE /users/:id
        if (method === 'DELETE' && !sub) {
          const result = userService.deleteUser(userId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return sendNoContent(res);
        }
      }
    }

    // ===================== /projects =========================
    if (resource === 'projects') {
      if (!idOrSub) {
        // GET /projects
        if (method === 'GET') {
          const result = projectService.listProjects();
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // POST /projects
        if (method === 'POST') {
          const body = await readBody(req) as Record<string, unknown>;
          const result = projectService.createProject({
            name: String(body.name ?? ''),
            description: String(body.description ?? ''),
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 201, result.data);
        }
      } else {
        const projectId = idOrSub;

        // /projects/:id/members
        if (sub === 'members') {
          // POST /projects/:id/members
          if (method === 'POST') {
            const body = await readBody(req) as Record<string, unknown>;
            if (!body.userId)
              return sendError(res, 400, 'Field "userId" is required');
            const result = projectService.addMember(
              projectId,
              String(body.userId),
            );
            if (!result.ok) return sendError(res, result.status, result.error);
            return send(res, 200, result.data);
          }
          // DELETE /projects/:id/members
          if (method === 'DELETE') {
            const body = await readBody(req) as Record<string, unknown>;
            if (!body.userId)
              return sendError(res, 400, 'Field "userId" is required');
            const result = projectService.removeMember(
              projectId,
              String(body.userId),
            );
            if (!result.ok) return sendError(res, result.status, result.error);
            return send(res, 200, result.data);
          }
        }

        // GET /projects/:id
        if (method === 'GET' && !sub) {
          const result = projectService.getProject(projectId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // PUT /projects/:id
        if (method === 'PUT' && !sub) {
          const body = await readBody(req) as Record<string, unknown>;
          const result = projectService.updateProject(projectId, {
            ...(body.name !== undefined ? { name: String(body.name) } : {}),
            ...(body.description !== undefined
              ? { description: String(body.description) }
              : {}),
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // DELETE /projects/:id
        if (method === 'DELETE' && !sub) {
          const result = projectService.deleteProject(projectId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return sendNoContent(res);
        }
      }
    }

    // ===================== /tasks ============================
    if (resource === 'tasks') {
      if (!idOrSub) {
        // GET /tasks?projectId=xxx
        if (method === 'GET') {
          const projectId = url.searchParams.get('projectId');
          if (!projectId)
            return sendError(res, 400, 'Query param "projectId" is required');
          const result = taskService.listByProject(projectId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // POST /tasks
        if (method === 'POST') {
          const body = await readBody(req) as Record<string, unknown>;
          const result = taskService.createTask({
            title: String(body.title ?? ''),
            description: String(body.description ?? ''),
            projectId: String(body.projectId ?? ''),
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 201, result.data);
        }
      } else {
        const taskId = idOrSub;

        // PUT /tasks/:id/status
        if (method === 'PUT' && sub === 'status') {
          const body = await readBody(req) as Record<string, unknown>;
          const newStatus = body.status as TaskStatus;
          if (!['todo', 'in-progress', 'done'].includes(newStatus))
            return sendError(res, 400, `Invalid status value: "${newStatus}"`);
          const result = taskService.changeStatus(taskId, newStatus);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }

        // PUT /tasks/:id/assign
        if (method === 'PUT' && sub === 'assign') {
          const body = await readBody(req) as Record<string, unknown>;
          if (!body.assigneeId)
            return sendError(res, 400, 'Field "assigneeId" is required');
          const result = taskService.assignTask(taskId, String(body.assigneeId));
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }

        // GET /tasks/:id
        if (method === 'GET' && !sub) {
          const result = taskService.getTask(taskId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // PUT /tasks/:id
        if (method === 'PUT' && !sub) {
          const body = await readBody(req) as Record<string, unknown>;
          const result = taskService.updateTask(taskId, {
            ...(body.title !== undefined ? { title: String(body.title) } : {}),
            ...(body.description !== undefined
              ? { description: String(body.description) }
              : {}),
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // DELETE /tasks/:id
        if (method === 'DELETE' && !sub) {
          const result = taskService.deleteTask(taskId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return sendNoContent(res);
        }
      }
    }

    // ===================== /comments =========================
    if (resource === 'comments') {
      if (!idOrSub) {
        // GET /comments?taskId=xxx
        if (method === 'GET') {
          const taskId = url.searchParams.get('taskId');
          if (!taskId)
            return sendError(res, 400, 'Query param "taskId" is required');
          const result = commentService.listByTask(taskId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }

        // POST /comments
        // The router enriches the comment input by looking up the task title
        // and author name — this is the router's job, not the comment service's.
        if (method === 'POST') {
          const body = await readBody(req) as Record<string, unknown>;
          const taskId = String(body.taskId ?? '');
          const authorId = String(body.authorId ?? '');

          // Look up task title (router is allowed to call any service).
          const taskResult = taskService.getTask(taskId);
          if (!taskResult.ok)
            return sendError(res, taskResult.status, taskResult.error);

          // Look up author name.
          const userResult = userService.getUser(authorId);
          if (!userResult.ok)
            return sendError(res, userResult.status, userResult.error);

          const result = commentService.createComment({
            taskId,
            authorId,
            body: String(body.body ?? ''),
            taskTitle: taskResult.data.title,
            authorName: userResult.data.name,
          });
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 201, result.data);
        }
      } else {
        const commentId = idOrSub;
        // GET /comments/:id
        if (method === 'GET' && !sub) {
          const result = commentService.getComment(commentId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
        // DELETE /comments/:id
        if (method === 'DELETE' && !sub) {
          const result = commentService.deleteComment(commentId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return sendNoContent(res);
        }
      }
    }

    // ===================== /notifications ====================
    if (resource === 'notifications') {
      if (!idOrSub) {
        // GET /notifications?userId=xxx
        if (method === 'GET') {
          const userId = url.searchParams.get('userId');
          if (!userId)
            return sendError(res, 400, 'Query param "userId" is required');
          const result = notificationService.listForUser(userId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
      } else {
        const notifId = idOrSub;
        // PUT /notifications/:id/read
        if (method === 'PUT' && sub === 'read') {
          const result = notificationService.markRead(notifId);
          if (!result.ok) return sendError(res, result.status, result.error);
          return send(res, 200, result.data);
        }
      }
    }

    // ===================== Fallthrough =======================
    sendError(res, 404, `Route not found: ${method} ${pathname}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, message);
  }
}
