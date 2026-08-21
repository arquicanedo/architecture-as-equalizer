export type ID = string;

export type User = {
  id: ID;
  name: string;
  email: string;
};

export type Project = {
  id: ID;
  name: string;
  description: string;
  memberIds: ID[];
};

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type Task = {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: ID | null;
  projectId: ID;
};

export type Comment = {
  id: ID;
  taskId: ID;
  authorId: ID;
  body: string;
  createdAt: string; // ISO
};

export type Notification = {
  id: ID;
  userId: ID;
  message: string;
  read: boolean;
  createdAt: string;
};
