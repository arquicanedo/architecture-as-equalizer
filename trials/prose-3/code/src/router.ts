import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { TaskStatus } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read the entire request body and parse it as JSON. */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

/** Send a JSON response. */
function sendJSON(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Send a standard error response. */
function sendError(res: ServerResponse, status: number, message: string): void {
  sendJSON(res, status, { error: message });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export class Router {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly commentService: CommentService,
    private readonly notificationService: NotificationService
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const baseURL = `http://${req.headers.host ?? 'localhost'}`;
    const url = new URL(req.url ?? '/', baseURL);
    const method = req.method?.toUpperCase() ?? 'GET';
    const pathname = url.pathname.replace(/\/$/, '') || '/'; // strip trailing slash

    // Split path into segments, removing empty strings produced by leading slash.
    const segments = pathname.split('/').filter(Boolean);
    // e.g. /users/123  → ['users', '123']
    // e.g. /projects/abc/members → ['projects', 'abc', 'members']

    try {
      // ── Users ─────────────────────────────────────────────────────────────
      if (segments[0] === 'users') {
        await this.handleUsers(method, segments, url, req, res);

      // ── Projects ──────────────────────────────────────────────────────────
      } else if (segments[0] === 'projects') {
        await this.handleProjects(method, segments, url, req, res);

      // ── Tasks ─────────────────────────────────────────────────────────────
      } else if (segments[0] === 'tasks') {
        await this.handleTasks(method, segments, url, req, res);

      // ── Comments ──────────────────────────────────────────────────────────
      } else if (segments[0] === 'comments') {
        await this.handleComments(method, segments, url, req, res);

      // ── Notifications ─────────────────────────────────────────────────────
      } else if (segments[0] === 'notifications') {
        await this.handleNotifications(method, segments, url, req, res);

      } else {
        sendError(res, 404, 'Not found.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Distinguish "not found" type errors from genuine bad requests.
      if (message.toLowerCase().includes('not found')) {
        sendError(res, 404, message);
      } else {
        sendError(res, 400, message);
      }
    }
  }

  // ── /users ────────────────────────────────────────────────────────────────

  private async handleUsers(
    method: string,
    segments: string[],
    _url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segments[1]; // may be undefined

    if (!id) {
      // GET /users
      if (method === 'GET') {
        return sendJSON(res, 200, this.userService.listUsers());
      }
      // POST /users
      if (method === 'POST') {
        const body = await readBody(req) as Record<string, unknown>;
        const user = this.userService.createUser({
          name: String(body.name ?? ''),
          email: String(body.email ?? ''),
        });
        return sendJSON(res, 201, user);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // GET /users/:id
    if (method === 'GET') {
      const user = this.userService.getUserById(id);
      if (!user) return sendError(res, 404, `User "${id}" not found.`);
      return sendJSON(res, 200, user);
    }
    // PUT /users/:id
    if (method === 'PUT') {
      const body = await readBody(req) as Record<string, unknown>;
      const user = this.userService.updateUser(id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        email: body.email !== undefined ? String(body.email) : undefined,
      });
      return sendJSON(res, 200, user);
    }
    // DELETE /users/:id
    if (method === 'DELETE') {
      this.userService.deleteUser(id);
      return sendJSON(res, 200, { message: `User "${id}" deleted.` });
    }

    return sendError(res, 405, 'Method not allowed.');
  }

  // ── /projects ─────────────────────────────────────────────────────────────

  private async handleProjects(
    method: string,
    segments: string[],
    _url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segments[1];
    const subResource = segments[2]; // e.g. 'members'

    // /projects
    if (!id) {
      if (method === 'GET') {
        return sendJSON(res, 200, this.projectService.listProjects());
      }
      if (method === 'POST') {
        const body = await readBody(req) as Record<string, unknown>;
        const project = this.projectService.createProject({
          name: String(body.name ?? ''),
          description: String(body.description ?? ''),
        });
        return sendJSON(res, 201, project);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /projects/:id/members
    if (subResource === 'members') {
      if (method === 'POST') {
        const body = await readBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? '');
        if (!userId) return sendError(res, 400, 'userId is required.');
        // Verify the user exists (cross-service lookup via the router)
        const user = this.userService.getUserById(userId);
        if (!user) return sendError(res, 404, `User "${userId}" not found.`);
        const project = this.projectService.addMember(id, userId);
        return sendJSON(res, 200, project);
      }
      if (method === 'DELETE') {
        const body = await readBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? '');
        if (!userId) return sendError(res, 400, 'userId is required.');
        const project = this.projectService.removeMember(id, userId);
        return sendJSON(res, 200, project);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /projects/:id
    if (method === 'GET') {
      const project = this.projectService.getProjectById(id);
      if (!project) return sendError(res, 404, `Project "${id}" not found.`);
      return sendJSON(res, 200, project);
    }
    if (method === 'PUT') {
      const body = await readBody(req) as Record<string, unknown>;
      const project = this.projectService.updateProject(id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
      });
      return sendJSON(res, 200, project);
    }
    if (method === 'DELETE') {
      this.projectService.deleteProject(id);
      return sendJSON(res, 200, { message: `Project "${id}" deleted.` });
    }

    return sendError(res, 405, 'Method not allowed.');
  }

  // ── /tasks ────────────────────────────────────────────────────────────────

  private async handleTasks(
    method: string,
    segments: string[],
    url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segments[1];
    const subResource = segments[2]; // 'status' | 'assign'

    // /tasks[?projectId=...]
    if (!id) {
      if (method === 'GET') {
        const projectId = url.searchParams.get('projectId') ?? undefined;
        return sendJSON(res, 200, this.taskService.listTasks(projectId));
      }
      if (method === 'POST') {
        const body = await readBody(req) as Record<string, unknown>;
        // Validate that the referenced project exists (cross-service, via router)
        const projectId = String(body.projectId ?? '');
        if (!projectId) return sendError(res, 400, 'projectId is required.');
        const project = this.projectService.getProjectById(projectId);
        if (!project) return sendError(res, 404, `Project "${projectId}" not found.`);

        const task = this.taskService.createTask({
          title: String(body.title ?? ''),
          description: String(body.description ?? ''),
          projectId,
        });
        return sendJSON(res, 201, task);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /tasks/:id/status
    if (subResource === 'status') {
      if (method === 'PUT') {
        const body = await readBody(req) as Record<string, unknown>;
        const newStatus = String(body.status ?? '') as TaskStatus;
        const task = this.taskService.changeStatus(id, newStatus);
        return sendJSON(res, 200, task);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /tasks/:id/assign
    if (subResource === 'assign') {
      if (method === 'PUT') {
        const body = await readBody(req) as Record<string, unknown>;
        const assigneeId = body.assigneeId === null ? null : String(body.assigneeId ?? '');

        // Validate assignee if provided
        if (assigneeId !== null && assigneeId !== '') {
          const user = this.userService.getUserById(assigneeId);
          if (!user) return sendError(res, 404, `User "${assigneeId}" not found.`);
        }
        const resolvedAssignee = assigneeId === '' ? null : assigneeId;
        const task = this.taskService.assignTask(id, resolvedAssignee);
        return sendJSON(res, 200, task);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /tasks/:id
    if (method === 'GET') {
      const task = this.taskService.getTaskById(id);
      if (!task) return sendError(res, 404, `Task "${id}" not found.`);
      return sendJSON(res, 200, task);
    }
    if (method === 'PUT') {
      const body = await readBody(req) as Record<string, unknown>;
      const task = this.taskService.updateTask(id, {
        title: body.title !== undefined ? String(body.title) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
      });
      return sendJSON(res, 200, task);
    }
    if (method === 'DELETE') {
      this.taskService.deleteTask(id);
      return sendJSON(res, 200, { message: `Task "${id}" deleted.` });
    }

    return sendError(res, 405, 'Method not allowed.');
  }

  // ── /comments ─────────────────────────────────────────────────────────────

  private async handleComments(
    method: string,
    segments: string[],
    url: URL,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segments[1];

    // /comments[?taskId=...]
    if (!id) {
      if (method === 'GET') {
        const taskId = url.searchParams.get('taskId') ?? undefined;
        return sendJSON(res, 200, this.commentService.listComments(taskId));
      }
      if (method === 'POST') {
        const body = await readBody(req) as Record<string, unknown>;

        const taskId = String(body.taskId ?? '');
        const authorId = String(body.authorId ?? '');

        // Cross-service validations via the router
        const task = this.taskService.getTaskById(taskId);
        if (!task) return sendError(res, 404, `Task "${taskId}" not found.`);

        const author = this.userService.getUserById(authorId);
        if (!author) return sendError(res, 404, `User (author) "${authorId}" not found.`);

        const comment = this.commentService.createComment(
          {
            taskId,
            authorId,
            body: String(body.body ?? ''),
          },
          task.title,
          task.assigneeId
        );
        return sendJSON(res, 201, comment);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /comments/:id
    if (method === 'GET') {
      const comment = this.commentService.getCommentById(id);
      if (!comment) return sendError(res, 404, `Comment "${id}" not found.`);
      return sendJSON(res, 200, comment);
    }
    if (method === 'DELETE') {
      this.commentService.deleteComment(id);
      return sendJSON(res, 200, { message: `Comment "${id}" deleted.` });
    }

    return sendError(res, 405, 'Method not allowed.');
  }

  // ── /notifications ────────────────────────────────────────────────────────

  private async handleNotifications(
    method: string,
    segments: string[],
    url: URL,
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const id = segments[1];
    const subResource = segments[2]; // 'read'

    // /notifications[?userId=...]
    if (!id) {
      if (method === 'GET') {
        const userId = url.searchParams.get('userId') ?? undefined;
        return sendJSON(res, 200, this.notificationService.listNotifications(userId));
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /notifications/:id/read
    if (subResource === 'read') {
      if (method === 'PUT') {
        const notification = this.notificationService.markAsRead(id);
        return sendJSON(res, 200, notification);
      }
      return sendError(res, 405, 'Method not allowed.');
    }

    // /notifications/:id
    if (method === 'GET') {
      const notification = this.notificationService.getNotificationById(id);
      if (!notification) return sendError(res, 404, `Notification "${id}" not found.`);
      return sendJSON(res, 200, notification);
    }

    return sendError(res, 405, 'Method not allowed.');
  }
}
