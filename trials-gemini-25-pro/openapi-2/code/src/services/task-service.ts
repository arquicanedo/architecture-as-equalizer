import crypto from 'crypto';
import { eventBus } from '../event-bus';

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

export class TaskService {
    private tasks: Map<string, Task> = new Map();

    createTask(input: CreateTaskInput): Task {
        const id = crypto.randomUUID();
        const task: Task = {
            id,
            ...input,
            status: 'todo',
            assigneeId: null,
        };
        this.tasks.set(id, task);
        return task;
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    listTasksByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    updateTask(id: string, input: UpdateTaskInput): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        const updatedTask = { ...task, ...input };
        this.tasks.set(id, updatedTask);
        return updatedTask;
    }

    deleteTask(id: string): boolean {
        return this.tasks.delete(id);
    }

    updateTaskStatus(id: string, status: TaskStatus): Task | { error: string } | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;

        // Enforce forward-only status transitions
        if (oldStatus === 'in-progress' && status === 'todo') {
            return { error: 'Cannot transition from in-progress to todo' };
        }
        if (oldStatus === 'done' && (status === 'todo' || status === 'in-progress')) {
            return { error: 'Cannot transition from done to todo or in-progress' };
        }

        task.status = status;
        this.tasks.set(id, task);

        if (task.assigneeId) {
            eventBus.publish('task.statusChanged', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
                oldStatus,
                newStatus: status,
            });
        }

        return task;
    }

    assignTask(id: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        task.assigneeId = assigneeId;
        this.tasks.set(id, task);

        eventBus.publish('task.assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: assigneeId,
        });

        return task;
    }
}
