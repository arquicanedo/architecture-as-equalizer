import { randomUUID } from 'crypto';

export type UUID = string;

export interface User {
    id: UUID;
    name: string;
    email: string;
}

export interface Project {
    id: UUID;
    name: string;
    description: string;
    memberIds: UUID[]; // User IDs
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
    id: UUID;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: UUID | null;
    projectId: UUID;
}

export interface Comment {
    id: UUID;
    taskId: UUID;
    authorId: UUID;
    body: string;
    createdAt: string; // ISO 8601 timestamp
}

export interface Notification {
    id: UUID;
    userId: UUID;
    message: string;
    read: boolean;
    createdAt: string; // ISO 8601 timestamp
}

// Event Payloads
export interface TaskAssignedEvent {
    taskId: UUID;
    taskTitle: string;
    assigneeId: UUID;
}

export interface TaskStatusChangedEvent {
    taskId: UUID;
    taskTitle: string;
    assigneeId: UUID | null; 
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
}

export interface CommentAddedEvent {
    commentId: UUID;
    taskId: UUID;
    authorId: UUID;
}
