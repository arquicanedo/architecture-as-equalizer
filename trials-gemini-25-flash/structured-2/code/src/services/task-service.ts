import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId?: string;
    projectId: string;
}

export class TaskService {
    private tasks: Map<string, Task>;

    constructor() {
        this.tasks = new Map();
    }

    create(title: string, description: string, projectId: string): Task {
        const id = randomUUID();
        const newTask: Task = { id, title, description, status: 'todo', projectId };
        this.tasks.set(id, newTask);
        return newTask;
    }

    getById(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    update(id: string, title?: string, description?: string): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            if (title !== undefined) task.title = title;
            if (description !== undefined) task.description = description;
            this.tasks.set(id, task);
            return task;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.tasks.delete(id);
    }

    assign(taskId: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(taskId);
        if (task) {
            task.assigneeId = assigneeId;
            this.tasks.set(taskId, task);
            eventBus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
            return task;
        }
        return undefined;
    }

    changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(taskId);
        if (task) {
            const oldStatus = task.status;
            // Enforce forward-only status transitions
            const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'done'];
            const oldStatusIndex = statusOrder.indexOf(oldStatus);
            const newStatusIndex = statusOrder.indexOf(newStatus);

            if (newStatusIndex > oldStatusIndex) {
                task.status = newStatus;
                this.tasks.set(taskId, task);
                if (task.assigneeId) {
                    eventBus.publish('task.statusChanged', {
                        taskId: task.id, 
                        taskTitle: task.title, 
                        assigneeId: task.assigneeId, 
                        oldStatus: oldStatus, 
                        newStatus: newStatus
                    });
                }
                return task;
            }
            // If not a valid transition, return undefined or throw an error
            console.warn(`Invalid status transition for task ${taskId}: ${oldStatus} -> ${newStatus}`);
            return undefined;
        }
        return undefined;
    }
}
