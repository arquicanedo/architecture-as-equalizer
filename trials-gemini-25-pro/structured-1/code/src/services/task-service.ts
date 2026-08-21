import crypto from "crypto";
import { EventBus } from "../event-bus";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: string | null;
    projectId: string;
}

const statusOrder: TaskStatus[] = ["todo", "in-progress", "done"];

export class TaskService {
    private readonly tasks: Map<string, Task> = new Map();

    constructor(private readonly eventBus: EventBus) {}

    create(title: string, description: string, projectId: string): Task {
        const id = crypto.randomUUID();
        const task: Task = { id, title, description, status: "todo", assigneeId: null, projectId };
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
            this.eventBus.publish("task.assigned", { 
                taskId: task.id, 
                taskTitle: task.title, 
                assigneeId: task.assigneeId 
            });
            return task;
        }
        return undefined;
    }

    changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;
        const oldIndex = statusOrder.indexOf(oldStatus);
        const newIndex = statusOrder.indexOf(newStatus);

        if (newIndex > oldIndex) {
            task.status = newStatus;
            if (task.assigneeId) {
                this.eventBus.publish("task.statusChanged", {
                    taskId: task.id,
                    taskTitle: task.title,
                    assigneeId: task.assigneeId,
                    oldStatus,
                    newStatus,
                });
            }
            return task;
        }

        return undefined; // Invalid status transition
    }
}