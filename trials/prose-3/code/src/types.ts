// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface CreateProjectDTO {
  name: string;
  description: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface CreateTaskDTO {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO timestamp
}

export interface CreateCommentDTO {
  taskId: string;
  authorId: string;
  body: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO timestamp
}

// ─── Event Bus ────────────────────────────────────────────────────────────────

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  projectId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  assigneeId: string | null;
  body: string;
}

export type EventPayloadMap = {
  'task.assigned': TaskAssignedPayload;
  'task.status_changed': TaskStatusChangedPayload;
  'comment.added': CommentAddedPayload;
};

export type EventName = keyof EventPayloadMap;
