import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId?: string;
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
    private tasks: Map<string, Task>;

    constructor() {
        this.tasks = new Map();
    }

    listTasks(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    createTask(input: CreateTaskInput): Task {
        const newTask: Task = {
            id: randomUUID(),
            title: input.title,
            description: input.description,
            status: "todo",
            projectId: input.projectId,
        };
        this.tasks.set(newTask.id, newTask);
        return newTask;
    }

    updateTask(id: string, input: UpdateTaskInput): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        if (input.title !== undefined) {
            task.title = input.title;
        }
        if (input.description !== undefined) {
            task.description = input.description;
        }
        this.tasks.set(id, task);
        return task;
    }

    deleteTask(id: string): boolean {
        return this.tasks.delete(id);
    }

    changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;

        // Enforce forward-only transitions
        if (
            (oldStatus === "todo" && newStatus === "in-progress") ||
            (oldStatus === "todo" && newStatus === "done") || // Allow direct from todo to done for simplicity
            (oldStatus === "in-progress" && newStatus === "done") ||
            (oldStatus === newStatus)
        ) {
            task.status = newStatus;
            this.tasks.set(id, task);

            eventBus.publish('task.statusChanged', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId, // May be undefined
                oldStatus: oldStatus,
                newStatus: newStatus,
            });
            return task;
        }

        return undefined; // Invalid status transition
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
            assigneeId: task.assigneeId,
        });

        return task;
    }
}
