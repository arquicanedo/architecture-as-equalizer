import * as crypto from 'crypto';
import {
    Task,
    ITaskService,
    TaskStatus,
    IEventBus,
    TaskAssignedPayload,
    TaskStatusChangedPayload
} from '../contracts';

export class TaskService implements ITaskService {
    private readonly tasks = new Map<string, Task>();

    constructor(private readonly eventBus: IEventBus) {}

    create(input: { title: string; description: string; projectId: string }): Task {
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

    getById(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(
            (task) => task.projectId === projectId
        );
    }

    update(id: string, input: Partial<{ title: string; description: string }>): Task {
        const task = this.getById(id);
        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }

        const updatedTask = { ...task, ...input };
        this.tasks.set(id, updatedTask);
        return updatedTask;
    }

    delete(id: string): void {
        if (!this.tasks.has(id)) {
            throw new Error(`Task with id ${id} not found`);
        }
        this.tasks.delete(id);
    }

    assign(taskId: string, assigneeId: string): Task {
        const task = this.getById(taskId);
        if (!task) {
            throw new Error(`Task with id ${taskId} not found`);
        }

        task.assigneeId = assigneeId;

        this.eventBus.publish('task.assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId,
        } as TaskAssignedPayload);

        return task;
    }

    changeStatus(taskId: string, newStatus: TaskStatus): Task {
        const task = this.getById(taskId);
        if (!task) {
            throw new Error(`Task with id ${taskId} not found`);
        }

        const oldStatus = task.status;

        // Enforce forward-only status transitions
        if (oldStatus === 'todo' && newStatus !== 'in-progress') {
            throw new Error(`Invalid status transition from todo to ${newStatus}`);
        }
        if (oldStatus === 'in-progress' && newStatus !== 'done') {
            throw new Error(`Invalid status transition from in-progress to ${newStatus}`);
        }
        if (oldStatus === 'done') {
            throw new Error(`Invalid status transition from done to ${newStatus}`);
        }
        // also handles the skipping case

        task.status = newStatus;

        this.eventBus.publish('task.statusChanged', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            oldStatus,
            newStatus,
        } as TaskStatusChangedPayload);

        return task;
    }
}
