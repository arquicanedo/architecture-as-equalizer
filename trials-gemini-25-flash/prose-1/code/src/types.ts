
export type User = {
  id: string;
  name: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  memberIds: Set<string>; // Storing as Set for easy add/remove and uniqueness
};

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null; // User ID of the assignee
};

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: number; // Timestamp
};

export type Notification = {
  id: string;
  userId: string; // Target user for this notification
  message: string;
  read: boolean;
  createdAt: number; // Timestamp
};

// Event Payloads
export type TaskAssignedEvent = {
  taskId: string;
  projectId: string;
  assigneeId: string;
  previousAssigneeId: string | null;
  timestamp: number;
};

export type TaskStatusChangedEvent = {
  taskId: string;
  projectId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: number;
};

export type CommentAddedEvent = {
  commentId: string;
  taskId: string;
  authorId: string;
  timestamp: number;
};

export type ProjectMemberAddedEvent = {
  projectId: string;
  userId: string;
  timestamp: number;
};

export type ProjectMemberRemovedEvent = {
  projectId: string;
  userId: string;
  timestamp: number;
};

// Generic Event for EventBus
export type EventPayload =
  | TaskAssignedEvent
  | TaskStatusChangedEvent
  | CommentAddedEvent
  | ProjectMemberAddedEvent
  | ProjectMemberRemovedEvent
  | { [key: string]: any }; // Allow for other event types

export type EventCallback<T extends EventPayload = EventPayload> = (payload: T) => void;
