import { ParsedRequest, ResponseHelper, Comment } from "../types";
import { store } from "../store";
import { generateId, now, createNotification } from "../utils";

// GET /comments  (optional query: ?taskId=xxx)
export function listComments(req: ParsedRequest, res: ResponseHelper): void {
  let comments = Array.from(store.comments.values());
  const { taskId } = req.query;
  if (taskId) {
    comments = comments.filter((c) => c.taskId === taskId);
  }
  res.json(200, comments);
}

// POST /comments
export function createComment(req: ParsedRequest, res: ResponseHelper): void {
  const body = req.body as Record<string, unknown>;

  if (
    !body ||
    typeof body.taskId !== "string" ||
    typeof body.authorId !== "string" ||
    typeof body.body !== "string"
  ) {
    res.error(
      400,
      "Fields 'taskId', 'authorId', and 'body' are required strings"
    );
    return;
  }

  const taskId = body.taskId.trim();
  const authorId = body.authorId.trim();
  const text = body.body.trim();

  if (!taskId || !authorId || !text) {
    res.error(
      400,
      "Fields 'taskId', 'authorId', and 'body' must not be empty"
    );
    return;
  }

  const task = store.tasks.get(taskId);
  if (!task) {
    res.error(404, `Task '${taskId}' not found`);
    return;
  }

  if (!store.users.has(authorId)) {
    res.error(404, `User '${authorId}' not found`);
    return;
  }

  const comment: Comment = {
    id: generateId(),
    taskId,
    authorId,
    body: text,
    createdAt: now(),
  };

  store.comments.set(comment.id, comment);

  // Notify task assignee (if different from comment author)
  if (task.assigneeId && task.assigneeId !== authorId) {
    const author = store.users.get(authorId);
    const authorName = author ? author.name : "Someone";
    createNotification(
      task.assigneeId,
      `${authorName} commented on task '${task.title}'`
    );
  }

  // Notify project members who are not the author and not already the assignee
  const project = store.projects.get(task.projectId);
  if (project) {
    const alreadyNotified = new Set<string>();
    if (task.assigneeId) alreadyNotified.add(task.assigneeId);
    alreadyNotified.add(authorId);

    for (const memberId of project.memberIds) {
      if (!alreadyNotified.has(memberId)) {
        const author = store.users.get(authorId);
        const authorName = author ? author.name : "Someone";
        createNotification(
          memberId,
          `${authorName} commented on task '${task.title}' in project '${project.name}'`
        );
        alreadyNotified.add(memberId);
      }
    }
  }

  res.json(201, comment);
}

// GET /comments/:id
export function getComment(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const comment = store.comments.get(id);
  if (!comment) {
    res.error(404, `Comment '${id}' not found`);
    return;
  }
  res.json(200, comment);
}

// DELETE /comments/:id
export function deleteComment(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  if (!store.comments.has(id)) {
    res.error(404, `Comment '${id}' not found`);
    return;
  }
  store.comments.delete(id);
  res.json(200, { message: `Comment '${id}' deleted` });
}
