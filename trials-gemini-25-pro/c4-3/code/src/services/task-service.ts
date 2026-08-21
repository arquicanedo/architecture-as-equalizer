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

const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'done'];

class TaskService {
    private readonly tasks = new Map<string, Task>();

    create(title: string, description: string, projectId: string): Task {
        const id = crypto.randomUUID();
        const task: Task = { id, title, description, status: 'todo', assigneeId: null, projectId };
        this.tasks.set(id, task);
        return task;
    }

    getById(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    update(id: string, title: string, description: string): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            task.title = title;
            task.description = description;
            this.tasks.set(id, task);
            return task;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.tasks.delete(id);
    }

    assign(id: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            task.assigneeId = assigneeId;
            this.tasks.set(id, task);
            eventBus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
            return task;
        }
        return undefined;
    }

    changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            const oldStatus = task.status;
            const oldIndex = statusOrder.indexOf(oldStatus);
            const newIndex = statusOrder.indexOf(newStatus);

            if (newIndex > oldIndex) {
                task.status = newStatus;
                this.tasks.set(id, task);
                eventBus.publish('task.statusChanged', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId, oldStatus, newStatus });
                return task;
            }
        }
        return undefined;
    }

}

export const taskService = new TaskService();
