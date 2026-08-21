import { randomBytes } from 'crypto';
import { EventBus } from './event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId?: string;
}

export class TaskService {
    private tasks: Map<string, Task> = new Map();

    constructor(private eventBus: EventBus) {}

    createTask(projectId: string, title: string, description: string): Task {
        const id = randomBytes(16).toString('hex');
        const task: Task = { id, projectId, title, description, status: 'todo' };
        this.tasks.set(id, task);
        this.eventBus.publish('task.created', task);
        return task;
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getTasksByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    updateTask(id: string, title: string, description: string): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        task.title = title;
        task.description = description;
        this.tasks.set(id, task);
        this.eventBus.publish('task.updated', task);
        return task;
    }

    deleteTask(id: string): boolean {
        const task = this.tasks.get(id);
        if(task) {
            this.eventBus.publish('task.deleted', task);
            return this.tasks.delete(id);
        }
        return false;
    }

    assignTask(id: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        task.assigneeId = assigneeId;
        this.tasks.set(id, task);
        this.eventBus.publish('task.assigned', { taskId: id, assigneeId, projectId: task.projectId });
        return task;
    }

    updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        // Validate status transition
        const allowedTransitions: { [key in TaskStatus]: TaskStatus[] } = {
            'todo': ['in-progress'],
            'in-progress': ['done'],
            'done': []
        };

        if (allowedTransitions[task.status].includes(status)) {
            task.status = status;
            this.tasks.set(id, task);
            this.eventBus.publish('task.status.changed', { taskId: id, status, projectId: task.projectId, assigneeId: task.assigneeId });
            return task;
        } else {
            // Invalid transition
            return undefined;
        }
    }
}
