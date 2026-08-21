
export interface User {
    id: string;
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
    id: string;
    name: string;
    description: string;
    memberIds: string[];
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
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: string | null;
    projectId: string;
}

export interface CreateTaskInput {
    title: string;
    description: string;
    projectId: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
}

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string; // ISO date string
}

export interface CreateCommentInput {
    taskId: string;
    authorId: string;
    body: string;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string; // ISO date string
}
