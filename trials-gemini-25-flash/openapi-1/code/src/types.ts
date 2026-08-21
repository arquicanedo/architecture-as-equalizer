
import { IncomingMessage, ServerResponse } from 'http';

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

export interface CreateUserInput {
    name: string;
    email: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
}

export interface Project {
    id: ProjectId;
    name: string;
    description: string;
    memberIds: UserId[];
}

export interface CreateProjectInput {
    name: string;
    description: string;
}

export interface UpdateProjectInput {
    name?: string;
    description?: string;
}

export enum TaskStatus {
    TODO = 'todo',
    IN_PROGRESS = 'in-progress',
    DONE = 'done',
}

export interface Task {
    id: TaskId;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: UserId | null;
    projectId: ProjectId;
}

export interface CreateTaskInput {
    title: string;
    description: string;
    projectId: ProjectId;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
}

export interface Comment {
    id: CommentId;
    taskId: TaskId;
    authorId: UserId;
    body: string;
    createdAt: string; // ISO 8601 date string
}

export interface CreateCommentInput {
    taskId: TaskId;
    authorId: UserId;
    body: string;
}

export interface Notification {
    id: NotificationId;
    userId: UserId;
    message: string;
    read: boolean;
    createdAt: string; // ISO 8601 date string
}

// Router types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteHandlerResult {
    statusCode: number;
    body?: object | string;
    headers?: { [key: string]: string };
}

export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    params: { [key: string]: string },
    query: { [key: string]: string },
    body: any
) => Promise<RouteHandlerResult>;

export interface Route {
    method: HttpMethod;
    path: RegExp; // Regex for path matching
    handler: RouteHandler;
    paramNames: string[]; // To extract named parameters from the path
}
