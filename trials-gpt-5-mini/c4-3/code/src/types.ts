export type UUID = string;

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface User {
  id: UUID;
  name: string;
  email: string;
}

export interface Project {
  id: UUID;
  name: string;
  description: string;
  memberIds: string[];
}

export interface Task {
  id: UUID;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface Comment {
  id: UUID;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
}

export interface Notification {
  id: UUID;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
