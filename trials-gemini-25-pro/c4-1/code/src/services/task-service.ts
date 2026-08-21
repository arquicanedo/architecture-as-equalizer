import { randomUUID } from 'crypto';
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

class TaskService {
    private taskStore: Map<string, Task> = new Map();

    create(title: string, description: string, projectId: string): Task {
        const id = randomUUID();
        const task: Task = {
            id,
            title,
            description,
            projectId,
            status: 'todo',
            assigneeId: null
        };
        this.taskStore.set(id, task);
        return task;
    }

    getById(id: string): Task | undefined {
        return this.taskStore.get(id);
    }

    getByProject(projectId: string): Task[] {
        return Array.from(this.taskStore.values()).filter(
            task => task.projectId === projectId
        );
    }

    update(id: string, title: string, description: string): Task | undefined {
        const task = this.taskStore.get(id);
        if (task) {
            task.title = title;
            task.description = description;
            return task;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.taskStore.delete(id);
    }

    assign(id: string, assigneeId: string): Task | undefined {
        const task = this.taskStore.get(id);
        if (task) {
            task.assigneeId = assigneeId;
            eventBus.publish('task.assigned', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
            });
            return task;
        }
        return undefined;
    }

    changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
        const task = this.taskStore.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;
        const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
            todo: ['in-progress'],
            'in-progress': ['done'],
            done: [],
        };

        if (allowedTransitions[oldStatus].includes(newStatus)) {
            task.status = newStatus;
            eventBus.publish('task.statusChanged', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
                oldStatus,
                newStatus,
            });
            return task;
        }
        // Invalid transition
        return undefined;
    }
}

export const taskService = new TaskService();
