import * as store from '../store.js';
import {
  ok, created, noContent,
  badRequest, notFound,
  isNonEmptyString, isObject,
} from '../helpers.js';
import type { RouteContext, RouteResponse, CreateCommentBody } from '../types.js';

// ─── GET /comments ────────────────────────────────────────────────────────────

export function listComments(ctx: RouteContext): RouteResponse {
  let all = Array.from(store.comments.values());

  // Optional filter: ?taskId=...
  const { taskId } = ctx.req.query;
  if (taskId) {
    all = all.filter(c => c.taskId === taskId);
  }

  return ok(all);
}

// ─── POST /comments ───────────────────────────────────────────────────────────

export function createComment(ctx: RouteContext): RouteResponse {
  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { taskId, authorId, body: text } = body as unknown as CreateCommentBody;

  if (!isNonEmptyString(taskId)) return badRequest('Field "taskId" is required and must be a non-empty string');
  if (!isNonEmptyString(authorId)) return badRequest('Field "authorId" is required and must be a non-empty string');
  if (!isNonEmptyString(text)) return badRequest('Field "body" is required and must be a non-empty string');

  const task = store.tasks.get(taskId);
  if (!task) return notFound(`Task "${taskId}" not found`);

  if (!store.users.has(authorId)) return notFound(`User "${authorId}" not found`);

  const comment = {
    id: store.newId(),
    taskId,
    authorId,
    body: text.trim(),
    createdAt: store.now(),
  };

  store.comments.set(comment.id, comment);

  // Notify task assignee (if any, and if they are not the comment author)
  if (task.assigneeId && task.assigneeId !== authorId) {
    const author = store.users.get(authorId);
    const authorName = author ? author.name : authorId;
    store.createNotification(
      task.assigneeId,
      `${authorName} commented on task "${task.title}": "${text.trim().slice(0, 60)}${text.length > 60 ? '…' : ''}"`,
    );
  }

  // Also notify all project members who are not the author or assignee
  const project = store.projects.get(task.projectId);
  if (project) {
    const alreadyNotified = new Set<string>([authorId, task.assigneeId ?? '']);
    for (const memberId of project.memberIds) {
      if (!alreadyNotified.has(memberId) && store.users.has(memberId)) {
        const author = store.users.get(authorId);
        const authorName = author ? author.name : authorId;
        store.createNotification(
          memberId,
          `${authorName} commented on task "${task.title}" in project "${project.name}"`,
        );
        alreadyNotified.add(memberId);
      }
    }
  }

  return created(comment);
}

// ─── GET /comments/:id ───────────────────────────────────────────────────────

export function getComment(ctx: RouteContext): RouteResponse {
  const comment = store.comments.get(ctx.params.id);
  if (!comment) return notFound(`Comment "${ctx.params.id}" not found`);
  return ok(comment);
}

// ─── DELETE /comments/:id ────────────────────────────────────────────────────

export function deleteComment(ctx: RouteContext): RouteResponse {
  if (!store.comments.has(ctx.params.id)) return notFound(`Comment "${ctx.params.id}" not found`);
  store.comments.delete(ctx.params.id);
  return noContent();
}
