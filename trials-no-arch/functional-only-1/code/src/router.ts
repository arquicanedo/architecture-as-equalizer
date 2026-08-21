import type { RouteHandler, RouteResponse, ParsedRequest } from './types.js';
import { methodNotAllowed, notFound } from './helpers.js';

// ─── Users ────────────────────────────────────────────────────────────────────
import {
  listUsers, createUser,
  getUser, updateUser, deleteUser,
} from './handlers/users.js';

// ─── Projects ─────────────────────────────────────────────────────────────────
import {
  listProjects, createProject,
  getProject, updateProject, deleteProject,
  addMember, removeMember,
} from './handlers/projects.js';

// ─── Tasks ────────────────────────────────────────────────────────────────────
import {
  listTasks, createTask,
  getTask, updateTask, deleteTask,
  updateTaskStatus, assignTask,
} from './handlers/tasks.js';

// ─── Comments ─────────────────────────────────────────────────────────────────
import {
  listComments, createComment,
  getComment, deleteComment,
} from './handlers/comments.js';

// ─── Notifications ────────────────────────────────────────────────────────────
import {
  listNotifications, markNotificationRead,
} from './handlers/notifications.js';

// ─── Route Table Entry ────────────────────────────────────────────────────────

interface Route {
  method: string;        // 'GET' | 'POST' | 'PUT' | 'DELETE' | '*'
  pattern: string[];     // e.g. ['users', ':id'] — ':param' means dynamic segment
  handler: RouteHandler;
}

// ─── Route Definitions ────────────────────────────────────────────────────────

const routes: Route[] = [
  // Users
  { method: 'GET',    pattern: ['users'],                    handler: listUsers },
  { method: 'POST',   pattern: ['users'],                    handler: createUser },
  { method: 'GET',    pattern: ['users', ':id'],             handler: getUser },
  { method: 'PUT',    pattern: ['users', ':id'],             handler: updateUser },
  { method: 'DELETE', pattern: ['users', ':id'],             handler: deleteUser },

  // Projects
  { method: 'GET',    pattern: ['projects'],                 handler: listProjects },
  { method: 'POST',   pattern: ['projects'],                 handler: createProject },
  { method: 'GET',    pattern: ['projects', ':id'],          handler: getProject },
  { method: 'PUT',    pattern: ['projects', ':id'],          handler: updateProject },
  { method: 'DELETE', pattern: ['projects', ':id'],          handler: deleteProject },
  { method: 'POST',   pattern: ['projects', ':id', 'members'], handler: addMember },
  { method: 'DELETE', pattern: ['projects', ':id', 'members'], handler: removeMember },

  // Tasks
  { method: 'GET',    pattern: ['tasks'],                    handler: listTasks },
  { method: 'POST',   pattern: ['tasks'],                    handler: createTask },
  { method: 'GET',    pattern: ['tasks', ':id'],             handler: getTask },
  { method: 'PUT',    pattern: ['tasks', ':id'],             handler: updateTask },
  { method: 'DELETE', pattern: ['tasks', ':id'],             handler: deleteTask },
  { method: 'PUT',    pattern: ['tasks', ':id', 'status'],   handler: updateTaskStatus },
  { method: 'PUT',    pattern: ['tasks', ':id', 'assign'],   handler: assignTask },

  // Comments
  { method: 'GET',    pattern: ['comments'],                 handler: listComments },
  { method: 'POST',   pattern: ['comments'],                 handler: createComment },
  { method: 'GET',    pattern: ['comments', ':id'],          handler: getComment },
  { method: 'DELETE', pattern: ['comments', ':id'],          handler: deleteComment },

  // Notifications
  { method: 'GET',    pattern: ['notifications'],            handler: listNotifications },
  { method: 'PUT',    pattern: ['notifications', ':id', 'read'], handler: markNotificationRead },
];

// ─── Matching Logic ───────────────────────────────────────────────────────────

function matchPattern(
  pattern: string[],
  segments: string[],
): Record<string, string> | null {
  if (pattern.length !== segments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i].startsWith(':')) {
      params[pattern[i].slice(1)] = segments[i];
    } else if (pattern[i] !== segments[i]) {
      return null;
    }
  }
  return params;
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export async function dispatch(req: ParsedRequest): Promise<RouteResponse> {
  const segments = req.segments;
  const method = req.method.toUpperCase();

  let pathMatched = false;

  for (const route of routes) {
    const params = matchPattern(route.pattern, segments);
    if (params === null) continue;

    pathMatched = true;

    if (route.method !== method) continue;

    return await route.handler({ req, params });
  }

  if (pathMatched) return methodNotAllowed();
  return notFound('Route not found');
}
