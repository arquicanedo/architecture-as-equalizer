import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

import { userService } from './services/user-service.js';
import { projectService } from './services/project-service.js';
import { taskService } from './services/task-service.js';
import { commentService } from './services/comment-service.js';
import { notificationService } from './services/notification-service.js';
import type { TaskStatus } from './types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  send(res, status, { error: message });
}

/** Send a 204 No Content response. */
function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

/** Read and parse the request body as JSON. Rejects on parse error. */
function readBody<T = unknown>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/** Extract path segments, ignoring leading/trailing slashes. */
function segments(pathname: string): string[] {
  return pathname.replace(/^\/|\/$/g, '').split('/');
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const baseUrl = `http://${req.headers.host ?? 'localhost'}`;
  const url = new URL(req.url ?? '/', baseUrl);
  const method = req.method ?? 'GET';
  const parts = segments(url.pathname);

  try {
    // ── /users ──────────────────────────────────────────────────────────────

    if (parts[0] === 'users') {
      // GET /users
      if (parts.length === 1 && method === 'GET') {
        send(res, 200, userService.listUsers());
        return;
      }

      // POST /users
      if (parts.length === 1 && method === 'POST') {
        const body = await readBody<{ name?: string; email?: string }>(req);
        if (!body.name || !body.email) {
          sendError(res, 400, 'name and email are required');
          return;
        }
        const user = userService.createUser({ name: body.name, email: body.email });
        send(res, 201, user);
        return;
      }

      // /users/:id
      if (parts.length === 2) {
        const id = parts[1];

        // GET /users/:id
        if (method === 'GET') {
          const user = userService.getUser(id);
          if (!user) { sendError(res, 404, 'User not found'); return; }
          send(res, 200, user);
          return;
        }

        // PUT /users/:id
        if (method === 'PUT') {
          const body = await readBody<{ name?: string; email?: string }>(req);
          const user = userService.updateUser(id, body);
          if (!user) { sendError(res, 404, 'User not found'); return; }
          send(res, 200, user);
          return;
        }

        // DELETE /users/:id
        if (method === 'DELETE') {
          const deleted = userService.deleteUser(id);
          if (!deleted) { sendError(res, 404, 'User not found'); return; }
          sendNoContent(res);
          return;
        }
      }
    }

    // ── /projects ────────────────────────────────────────────────────────────

    if (parts[0] === 'projects') {
      // GET /projects
      if (parts.length === 1 && method === 'GET') {
        send(res, 200, projectService.listProjects());
        return;
      }

      // POST /projects
      if (parts.length === 1 && method === 'POST') {
        const body = await readBody<{ name?: string; description?: string }>(req);
        if (!body.name || !body.description) {
          sendError(res, 400, 'name and description are required');
          return;
        }
        const project = projectService.createProject({
          name: body.name,
          description: body.description,
        });
        send(res, 201, project);
        return;
      }

      // /projects/:id  (no sub-path)
      if (parts.length === 2) {
        const id = parts[1];

        // GET /projects/:id
        if (method === 'GET') {
          const project = projectService.getProject(id);
          if (!project) { sendError(res, 404, 'Project not found'); return; }
          send(res, 200, project);
          return;
        }

        // PUT /projects/:id
        if (method === 'PUT') {
          const body = await readBody<{ name?: string; description?: string }>(req);
          const project = projectService.updateProject(id, body);
          if (!project) { sendError(res, 404, 'Project not found'); return; }
          send(res, 200, project);
          return;
        }

        // DELETE /projects/:id
        if (method === 'DELETE') {
          const deleted = projectService.deleteProject(id);
          if (!deleted) { sendError(res, 404, 'Project not found'); return; }
          sendNoContent(res);
          return;
        }
      }

      // /projects/:id/members
      if (parts.length === 3 && parts[2] === 'members') {
        const projectId = parts[1];

        // POST /projects/:id/members — add member
        if (method === 'POST') {
          const body = await readBody<{ userId?: string }>(req);
          if (!body.userId) { sendError(res, 400, 'userId is required'); return; }
          const project = projectService.addMember(projectId, body.userId);
          if (!project) { sendError(res, 404, 'Project not found'); return; }
          send(res, 200, project);
          return;
        }

        // DELETE /projects/:id/members — remove member
        if (method === 'DELETE') {
          const body = await readBody<{ userId?: string }>(req);
          if (!body.userId) { sendError(res, 400, 'userId is required'); return; }
          const project = projectService.removeMember(projectId, body.userId);
          if (!project) { sendError(res, 404, 'Project not found'); return; }
          send(res, 200, project);
          return;
        }
      }
    }

    // ── /tasks ───────────────────────────────────────────────────────────────

    if (parts[0] === 'tasks') {
      // GET /tasks?projectId=...
      if (parts.length === 1 && method === 'GET') {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) {
          sendError(res, 400, 'projectId query parameter is required');
          return;
        }
        send(res, 200, taskService.listByProject(projectId));
        return;
      }

      // POST /tasks
      if (parts.length === 1 && method === 'POST') {
        const body = await readBody<{
          title?: string;
          description?: string;
          projectId?: string;
        }>(req);
        if (!body.title || !body.description || !body.projectId) {
          sendError(res, 400, 'title, description and projectId are required');
          return;
        }
        const task = taskService.createTask({
          title: body.title,
          description: body.description,
          projectId: body.projectId,
        });
        send(res, 201, task);
        return;
      }

      // /tasks/:id  (no sub-path)
      if (parts.length === 2) {
        const id = parts[1];

        // GET /tasks/:id
        if (method === 'GET') {
          const task = taskService.getTask(id);
          if (!task) { sendError(res, 404, 'Task not found'); return; }
          send(res, 200, task);
          return;
        }

        // PUT /tasks/:id
        if (method === 'PUT') {
          const body = await readBody<{ title?: string; description?: string }>(req);
          const task = taskService.updateTask(id, body);
          if (!task) { sendError(res, 404, 'Task not found'); return; }
          send(res, 200, task);
          return;
        }

        // DELETE /tasks/:id
        if (method === 'DELETE') {
          const deleted = taskService.deleteTask(id);
          if (!deleted) { sendError(res, 404, 'Task not found'); return; }
          sendNoContent(res);
          return;
        }
      }

      // /tasks/:id/status
      if (parts.length === 3 && parts[2] === 'status') {
        const id = parts[1];

        // PUT /tasks/:id/status
        if (method === 'PUT') {
          const body = await readBody<{ status?: string }>(req);
          const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
          if (!body.status || !validStatuses.includes(body.status as TaskStatus)) {
            sendError(res, 400, 'status must be one of: todo, in-progress, done');
            return;
          }
          const result = taskService.changeStatus(id, body.status as TaskStatus);
          if (!result.ok) {
            if (result.reason === 'not_found') {
              sendError(res, 404, 'Task not found');
            } else {
              sendError(
                res,
                400,
                `Invalid status transition to "${body.status}". ` +
                  'Status can only move forward: todo → in-progress → done.',
              );
            }
            return;
          }
          send(res, 200, result.task);
          return;
        }
      }

      // /tasks/:id/assign
      if (parts.length === 3 && parts[2] === 'assign') {
        const id = parts[1];

        // PUT /tasks/:id/assign
        if (method === 'PUT') {
          const body = await readBody<{ assigneeId?: string }>(req);
          if (!body.assigneeId) {
            sendError(res, 400, 'assigneeId is required');
            return;
          }
          const task = taskService.assignTask(id, body.assigneeId);
          if (!task) { sendError(res, 404, 'Task not found'); return; }
          send(res, 200, task);
          return;
        }
      }
    }

    // ── /comments ────────────────────────────────────────────────────────────

    if (parts[0] === 'comments') {
      // GET /comments?taskId=...
      if (parts.length === 1 && method === 'GET') {
        const taskId = url.searchParams.get('taskId');
        if (!taskId) {
          sendError(res, 400, 'taskId query parameter is required');
          return;
        }
        send(res, 200, commentService.listByTask(taskId));
        return;
      }

      // POST /comments
      if (parts.length === 1 && method === 'POST') {
        const body = await readBody<{
          taskId?: string;
          authorId?: string;
          body?: string;
        }>(req);
        if (!body.taskId || !body.authorId || !body.body) {
          sendError(res, 400, 'taskId, authorId and body are required');
          return;
        }

        // The router is the ONLY place allowed to do cross-service data lookup.
        // CommentService needs taskTitle and authorName for its event payload,
        // so we resolve them here before delegating to the service.
        const task = taskService.getTask(body.taskId);
        if (!task) { sendError(res, 404, 'Task not found'); return; }

        const author = userService.getUser(body.authorId);
        if (!author) { sendError(res, 404, 'Author (user) not found'); return; }

        const comment = commentService.createComment({
          taskId: body.taskId,
          authorId: body.authorId,
          body: body.body,
          taskTitle: task.title,
          authorName: author.name,
        });
        send(res, 201, comment);
        return;
      }

      // /comments/:id
      if (parts.length === 2) {
        const id = parts[1];

        // GET /comments/:id
        if (method === 'GET') {
          const comment = commentService.getComment(id);
          if (!comment) { sendError(res, 404, 'Comment not found'); return; }
          send(res, 200, comment);
          return;
        }

        // DELETE /comments/:id
        if (method === 'DELETE') {
          const deleted = commentService.deleteComment(id);
          if (!deleted) { sendError(res, 404, 'Comment not found'); return; }
          sendNoContent(res);
          return;
        }
      }
    }

    // ── /notifications ────────────────────────────────────────────────────────

    if (parts[0] === 'notifications') {
      // GET /notifications?userId=...
      if (parts.length === 1 && method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          sendError(res, 400, 'userId query parameter is required');
          return;
        }
        send(res, 200, notificationService.listForUser(userId));
        return;
      }

      // PUT /notifications/:id/read
      if (parts.length === 3 && parts[2] === 'read' && method === 'PUT') {
        const id = parts[1];
        const notification = notificationService.markRead(id);
        if (!notification) { sendError(res, 404, 'Notification not found'); return; }
        send(res, 200, notification);
        return;
      }
    }

    // ── 404 fallthrough ───────────────────────────────────────────────────────
    sendError(res, 404, `Cannot ${method} ${url.pathname}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, message);
  }
}
