export type UUID = string;

export interface User {
  id: UUID;
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

export interface Project {
  id: UUID;
  name: string;
  description: string;
  memberIds: UUID[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: UUID;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: UUID | null;
  projectId: UUID;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: UUID;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
}

export interface Comment {
  id: UUID;
  taskId: UUID;
  authorId: UUID;
  body: string;
  createdAt: string; // ISO date-time
}

export interface CreateCommentInput {
  taskId: UUID;
  authorId: UUID;
  body: string;
}

export interface Notification {
  id: UUID;
  userId: UUID;
  message: string;
  read: boolean;
  createdAt: string; // ISO date-time
}
