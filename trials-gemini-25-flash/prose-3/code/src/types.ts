
export type UserId = string;
export type ProjectId = string;
export type TaskId = string;
export type CommentId = string;
export type NotificationId = string;

export interface User {
  id: UserId;
  name: string;
  email: string;
}

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  memberIds: UserId[];
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: UserId;
}

export interface Comment {
  id: CommentId;
  taskId: TaskId;
  authorId: UserId;
  text: string;
  createdAt: number; // Timestamp
}

export interface Notification {
  id: NotificationId;
  userId: UserId;
  message: string;
  read: boolean;
  createdAt: number; // Timestamp
}

// Event Bus Types
export type EventName = 'task.assigned' | 'comment.added' | 'task.statusChanged' | 'project.memberAdded';

export interface TaskAssignedEvent {
  taskId: TaskId;
  assigneeId: UserId;
  previousAssigneeId?: UserId;
}

export interface CommentAddedEvent {
  commentId: CommentId;
  taskId: TaskId;
  authorId: UserId;
}

export interface TaskStatusChangedEvent {
  taskId: TaskId;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
}

export interface ProjectMemberAddedEvent {
  projectId: ProjectId;
  userId: UserId;
}

export type EventPayload = TaskAssignedEvent | CommentAddedEvent | TaskStatusChangedEvent | ProjectMemberAddedEvent | any;

export interface Event {
  name: EventName;
  payload: EventPayload;
}

export type EventHandler = (event: Event) => void;
