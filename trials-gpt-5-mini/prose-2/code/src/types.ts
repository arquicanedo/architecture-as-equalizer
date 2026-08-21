export type ID = string;

export interface User {
  id: ID;
  name: string;
  email: string;
}

export interface Project {
  id: ID;
  name: string;
  description?: string;
  members: ID[];
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: ID | null;
  projectId: ID;
}

export interface Comment {
  id: ID;
  taskId: ID;
  authorId: ID;
  body: string;
  createdAt: string; // ISO
}

export interface Notification {
  id: ID;
  userId: ID;
  message: string;
  read: boolean;
  createdAt: string;
}
