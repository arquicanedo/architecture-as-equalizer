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
    assigneeId?: string;
}

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    text: string;
    createdAt: Date;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Date;
}
