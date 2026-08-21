// ─── Domain Models ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO timestamp
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO timestamp
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

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
  assigneeId: string | null;
  body: string;
}

export interface TaskCreatedPayload {
  taskId: string;
  taskTitle: string;
  projectId: string;
}

export interface MemberAddedPayload {
  projectId: string;
  projectName: string;
  userId: string;
}

// ─── Event Map ────────────────────────────────────────────────────────────────

export interface EventMap {
  "task.assigned": TaskAssignedPayload;
  "task.statusChanged": TaskStatusChangedPayload;
  "task.created": TaskCreatedPayload;
  "comment.added": CommentAddedPayload;
  "member.added": MemberAddedPayload;
}

export type EventName = keyof EventMap;

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

export interface ApiRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}
