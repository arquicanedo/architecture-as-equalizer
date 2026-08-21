
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

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: number; // Timestamp
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number; // Timestamp
}

// Event Payloads
export interface TaskAssignedEvent {
  taskId: string;
  projectId: string;
  assigneeId: string;
  previousAssigneeId: string | null;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  projectId: string;
  newStatus: TaskStatus;
  oldStatus: TaskStatus;
}

export interface CommentAddedEvent {
  commentId: string;
  taskId: string;
  authorId: string;
  text: string;
}
