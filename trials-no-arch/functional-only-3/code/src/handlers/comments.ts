import { comments, tasks, users, newId, createNotification, projects } from "../store.js";
import type { RouteHandler, CreateCommentBody } from "../types.js";

// ─── GET /comments ────────────────────────────────────────────────────────────

export const listComments: RouteHandler = async (req) => {
  const { taskId } = req.query;
  let result = Array.from(comments.values());
  if (taskId) {
    result = result.filter((c) => c.taskId === taskId);
  }
  return { status: 200, body: result };
};

// ─── POST /comments ───────────────────────────────────────────────────────────

export const createComment: RouteHandler = async (req) => {
  const data = req.body as CreateCommentBody;

  if (!data || typeof data.taskId !== "string" || !data.taskId.trim()) {
    return { status: 400, body: { error: "taskId is required" } };
  }
  if (typeof data.authorId !== "string" || !data.authorId.trim()) {
    return { status: 400, body: { error: "authorId is required" } };
  }
  if (typeof data.body !== "string" || !data.body.trim()) {
    return { status: 400, body: { error: "body is required" } };
  }

  const task = tasks.get(data.taskId.trim());
  if (!task) return { status: 404, body: { error: "Task not found" } };

  const author = users.get(data.authorId.trim());
  if (!author) return { status: 404, body: { error: "Author user not found" } };

  const comment = {
    id: newId(),
    taskId: data.taskId.trim(),
    authorId: data.authorId.trim(),
    body: data.body.trim(),
    createdAt: new Date().toISOString(),
  };
  comments.set(comment.id, comment);

  // ── Notifications ──────────────────────────────────────────────────────────
  const project = projects.get(task.projectId);
  const projectName = project ? project.name : "Unknown Project";

  // Set of users already notified to avoid duplicates
  const notified = new Set<string>();

  // Notify task assignee (if different from author)
  if (task.assigneeId && task.assigneeId !== comment.authorId) {
    createNotification(
      task.assigneeId,
      `${author.name} commented on task "${task.title}" (assigned to you) in project "${projectName}"`,
      "comment_added"
    );
    notified.add(task.assigneeId);
  }

  // Notify project members (except author and already notified users)
  if (project) {
    for (const memberId of project.memberIds) {
      if (memberId !== comment.authorId && !notified.has(memberId)) {
        createNotification(
          memberId,
          `${author.name} commented on task "${task.title}" in project "${projectName}"`,
          "comment_added"
        );
        notified.add(memberId);
      }
    }
  }

  return { status: 201, body: comment };
};

// ─── GET /comments/:id ────────────────────────────────────────────────────────

export const getComment: RouteHandler = async (req) => {
  const comment = comments.get(req.query["id"]);
  if (!comment) return { status: 404, body: { error: "Comment not found" } };
  return { status: 200, body: comment };
};

// ─── DELETE /comments/:id ─────────────────────────────────────────────────────

export const deleteComment: RouteHandler = async (req) => {
  const id = req.query["id"];
  if (!comments.has(id)) return { status: 404, body: { error: "Comment not found" } };
  comments.delete(id);
  return { status: 200, body: { message: "Comment deleted" } };
};
