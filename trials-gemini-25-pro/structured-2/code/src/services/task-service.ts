import crypto from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: string | null;
    projectId: string;
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];

export class TaskService {
    private tasks: Map<string, Task> = new Map();

    constructor(private eventBus: EventBus) {}

    // Create
    create(data: { title: string; description: string; projectId: string }): Task {
        const id = crypto.randomUUID();
        const task: Task = {
            id,
            ...data,
            status: 'todo',
            assigneeId: null,
        };
        this.tasks.set(id, task);
        return task;
    }

    // Get by ID
    getById(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    // Get by Project
    getByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    // Update (general purpose)
    update(id: string, data: Partial<Omit<Task, 'id' | 'status' | 'assigneeId' | 'projectId'>>): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        const updatedTask = { ...task, ...data };
        this.tasks.set(id, updatedTask);
        return updatedTask;
    }

    // Delete
    delete(id: string): boolean {
        return this.tasks.delete(id);
    }

    // Assign
    assign(id: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        task.assigneeId = assigneeId;

        this.eventBus.publish('task.assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
        });

        return task;
    }

    // Change Status
    changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;
        const oldIndex = STATUS_ORDER.indexOf(oldStatus);
        const newIndex = STATUS_ORDER.indexOf(newStatus);

        if (newIndex < oldIndex) {
            // Disallow backward transitions
            return undefined;
        }

        task.status = newStatus;

        if (task.assigneeId) {
            this.eventBus.publish('task.statusChanged', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
                oldStatus,
                newStatus,
            });
        }

        return task;
    }
}
