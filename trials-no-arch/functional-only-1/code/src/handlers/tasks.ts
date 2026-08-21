import * as store from '../store.js';
import {
  ok, created, noContent,
  badRequest, notFound, unprocessable,
  isNonEmptyString, isObject,
} from '../helpers.js';
import type {
  RouteContext, RouteResponse,
  CreateTaskBody, UpdateTaskBody, UpdateTaskStatusBody, AssignTaskBody,
  TaskStatus,
} from '../types.js';
import { VALID_TRANSITIONS } from '../types.js';

// ─── GET /tasks ───────────────────────────────────────────────────────────────

export function listTasks(ctx: RouteContext): RouteResponse {
  let all = Array.from(store.tasks.values());

  // Optional filter: ?projectId=...
  const { projectId } = ctx.req.query;
  if (projectId) {
    all = all.filter(t => t.projectId === projectId);
  }

  return ok(all);
}

// ─── POST /tasks ──────────────────────────────────────────────────────────────

export function createTask(ctx: RouteContext): RouteResponse {
  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { title, description, projectId, assigneeId } = body as unknown as CreateTaskBody;

  if (!isNonEmptyString(title)) return badRequest('Field "title" is required and must be a non-empty string');
  if (!isNonEmptyString(projectId)) return badRequest('Field "projectId" is required and must be a non-empty string');

  if (!store.projects.has(projectId)) return notFound(`Project "${projectId}" not found`);

  if (assigneeId !== undefined && assigneeId !== null) {
    if (!isNonEmptyString(assigneeId)) return badRequest('Field "assigneeId" must be a non-empty string or null');
    if (!store.users.has(assigneeId)) return notFound(`User "${assigneeId}" not found`);
  }

  const task = {
    id: store.newId(),
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    status: 'todo' as TaskStatus,
    projectId,
    assigneeId: assigneeId ?? null,
    createdAt: store.now(),
    updatedAt: store.now(),
  };

  store.tasks.set(task.id, task);

  // Notify assignee if set at creation
  if (task.assigneeId) {
    store.createNotification(
      task.assigneeId,
      `You have been assigned to task "${task.title}"`,
    );
  }

  return created(task);
}

// ─── GET /tasks/:id ───────────────────────────────────────────────────────────

export function getTask(ctx: RouteContext): RouteResponse {
  const task = store.tasks.get(ctx.params.id);
  if (!task) return notFound(`Task "${ctx.params.id}" not found`);
  return ok(task);
}

// ─── PUT /tasks/:id ───────────────────────────────────────────────────────────

export function updateTask(ctx: RouteContext): RouteResponse {
  const task = store.tasks.get(ctx.params.id);
  if (!task) return notFound(`Task "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { title, description } = body as unknown as UpdateTaskBody;

  if (title !== undefined && !isNonEmptyString(title)) {
    return badRequest('Field "title" must be a non-empty string');
  }

  const updated = {
    ...task,
    ...(title ? { title: title.trim() } : {}),
    ...(description !== undefined ? { description: description.trim() } : {}),
    updatedAt: store.now(),
  };

  store.tasks.set(task.id, updated);
  return ok(updated);
}

// ─── DELETE /tasks/:id ────────────────────────────────────────────────────────

export function deleteTask(ctx: RouteContext): RouteResponse {
  if (!store.tasks.has(ctx.params.id)) return notFound(`Task "${ctx.params.id}" not found`);
  store.tasks.delete(ctx.params.id);
  return noContent();
}

// ─── PUT /tasks/:id/status ───────────────────────────────────────────────────

export function updateTaskStatus(ctx: RouteContext): RouteResponse {
  const task = store.tasks.get(ctx.params.id);
  if (!task) return notFound(`Task "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { status } = body as unknown as UpdateTaskStatusBody;

  const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
  if (!validStatuses.includes(status)) {
    return badRequest(`Field "status" must be one of: ${validStatuses.join(', ')}`);
  }

  const allowedNext = VALID_TRANSITIONS[task.status];
  if (!allowedNext.includes(status)) {
    return unprocessable(
      `Cannot transition task from "${task.status}" to "${status}". ` +
      `Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal state)'}`,
    );
  }

  const updated = { ...task, status, updatedAt: store.now() };
  store.tasks.set(task.id, updated);

  // Notify assignee about status change
  if (task.assigneeId) {
    store.createNotification(
      task.assigneeId,
      `Task "${task.title}" status changed from "${task.status}" to "${status}"`,
    );
  }

  return ok(updated);
}

// ─── PUT /tasks/:id/assign ───────────────────────────────────────────────────

export function assignTask(ctx: RouteContext): RouteResponse {
  const task = store.tasks.get(ctx.params.id);
  if (!task) return notFound(`Task "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { assigneeId } = body as unknown as AssignTaskBody;

  if (assigneeId !== null && assigneeId !== undefined) {
    if (!isNonEmptyString(assigneeId)) return badRequest('Field "assigneeId" must be a non-empty string or null');
    if (!store.users.has(assigneeId)) return notFound(`User "${assigneeId}" not found`);
  }

  const resolvedAssigneeId = assigneeId ?? null;
  const updated = { ...task, assigneeId: resolvedAssigneeId, updatedAt: store.now() };
  store.tasks.set(task.id, updated);

  // Notify the new assignee
  if (resolvedAssigneeId) {
    store.createNotification(
      resolvedAssigneeId,
      `You have been assigned to task "${task.title}"`,
    );
  }

  return ok(updated);
}
