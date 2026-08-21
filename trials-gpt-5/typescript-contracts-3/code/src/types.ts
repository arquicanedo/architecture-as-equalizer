// Shared type definitions for the Task Management API

// ============================================================
// Data Models
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export type TaskStatus = "todo" | "in-progress" | "done";

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
  createdAt: string; // ISO 8601
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

// ============================================================
// Event Bus Contract
// ============================================================

export interface IEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): void;
}

// Event payloads
export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
}

// ============================================================
// Service Contracts
// ============================================================

export interface IUserService {
  create(input: { name: string; email: string }): User;
  getById(id: string): User;
  getAll(): User[];
  update(id: string, input: Partial<{ name: string; email: string }>): User;
  delete(id: string): void;
}

export interface IProjectService {
  create(input: { name: string; description: string }): Project;
  getById(id: string): Project;
  getAll(): Project[];
  update(id: string, input: Partial<{ name: string; description: string }>): Project;
  delete(id: string): void;
  addMember(projectId: string, userId: string): Project;
  removeMember(projectId: string, userId: string): Project;
}

export interface ITaskService {
  create(input: { title: string; description: string; projectId: string }): Task;
  getById(id: string): Task;
  getByProject(projectId: string): Task[];
  update(id: string, input: Partial<{ title: string; description: string }>): Task;
  delete(id: string): void;
  assign(taskId: string, assigneeId: string): Task;
  changeStatus(taskId: string, newStatus: TaskStatus): Task;
}

export interface ICommentService {
  create(input: { taskId: string; authorId: string; body: string }): Comment;
  getById(id: string): Comment;
  getByTask(taskId: string): Comment[];
  delete(id: string): void;
}

export interface INotificationService {
  getByUser(userId: string): Notification[];
  markAsRead(notificationId: string): Notification;
}
