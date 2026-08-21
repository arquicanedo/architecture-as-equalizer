/**
 * Shared domain types used across services and the router.
 * Services own their data; these types are the shared language.
 */

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO-8601 timestamp
}

export interface CreateCommentInput {
  taskId: string;
  authorId: string;
  body: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO-8601 timestamp
}

// ─── Event payloads ───────────────────────────────────────────────────────────

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  projectId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  projectId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  assigneeId: string | null; // notified if different from author
  body: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}
