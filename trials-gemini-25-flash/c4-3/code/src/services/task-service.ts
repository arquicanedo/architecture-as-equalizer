import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

/**
 * @deprecated Use `src/types/task.ts` once type definitions are centralized
 */
export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: string | null;
    projectId: string;
}

/**
 * Manages tasks with status transitions and publishes related events.
 * Adheres to ADR-002: Service-Owned Data Stores.
 */
export class TaskService {
    private taskStore: Map<string, Task>;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.taskStore = new Map();
        this.eventBus = eventBus;
    }

    /**
     * Creates a new task.
     * @param title The title of the task.
     * @param description The description of the task.
     * @param projectId The ID of the project the task belongs to.
     * @param assigneeId Optional ID of the user assigned to the task.
     * @returns The newly created task.
     */
    create(title: string, description: string, projectId: string, assigneeId: string | null = null): Task {
        const newTask: Task = {
            id: randomUUID(),
            title,
            description,
            status: "todo", // Default status
            assigneeId,
            projectId,
        };
        this.taskStore.set(newTask.id, newTask);

        if (assigneeId) {
            this.eventBus.publish("task.assigned", {
                taskId: newTask.id,
                taskTitle: newTask.title,
                assigneeId: assigneeId,
            });
        }

        return newTask;
    }

    /**
     * Retrieves a task by its ID.
     * @param id The ID of the task.
     * @returns The task, or undefined if not found.
     */
    getById(id: string): Task | undefined {
        return this.taskStore.get(id);
    }

    /**
     * Retrieves all tasks for a given project.
     * @param projectId The ID of the project.
     * @returns An array of tasks belonging to the project.
     */
    getByProject(projectId: string): Task[] {
        return Array.from(this.taskStore.values()).filter(task => task.projectId === projectId);
    }

    /**
     * Updates an existing task.
     * @param id The ID of the task to update.
     * @param updates An object containing the fields to update (title, description, assigneeId).
     * @returns The updated task, or undefined if not found.
     */
    update(id: string, updates: { title?: string; description?: string; assigneeId?: string | null }): Task | undefined {
        const task = this.taskStore.get(id);
        if (!task) {
            return undefined; // Task not found
        }

        const oldAssigneeId = task.assigneeId;

        if (updates.title !== undefined) {
            task.title = updates.title;
        }
        if (updates.description !== undefined) {
            task.description = updates.description;
        }
        if (updates.assigneeId !== undefined) {
            task.assigneeId = updates.assigneeId;
        }

        this.taskStore.set(id, task);

        if (updates.assigneeId !== undefined && oldAssigneeId !== updates.assigneeId) {
            this.eventBus.publish("task.assigned", {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
            });
        }

        return { ...task };
    }

    /**
     * Deletes a task by its ID.
     * @param id The ID of the task to delete.
     * @returns True if the task was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.taskStore.delete(id);
    }

    /**
     * Assigns a user to a task.
     * @param id The ID of the task.
     * @param assigneeId The ID of the user to assign.
     * @returns The updated task, or undefined if not found.
     */
    assign(id: string, assigneeId: string): Task | undefined {
        const task = this.taskStore.get(id);
        if (!task) {
            return undefined;
        }

        if (task.assigneeId !== assigneeId) {
            task.assigneeId = assigneeId;
            this.taskStore.set(id, task);
            this.eventBus.publish("task.assigned", {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
            });
        }
        return { ...task };
    }

    /**
     * Changes the status of a task, enforcing forward-only transitions.
     * @param id The ID of the task.
     * @param newStatus The new status to set.
     * @returns The updated task, or undefined if not found or transition is invalid.
     */
    changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
        const task = this.taskStore.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;

        if (!this.isValidStatusTransition(oldStatus, newStatus)) {
            console.warn(`Invalid status transition for task ${id}: ${oldStatus} -> ${newStatus}`);
            return undefined; // Invalid transition
        }

        task.status = newStatus;
        this.taskStore.set(id, task);
        this.eventBus.publish("task.statusChanged", {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            oldStatus,
            newStatus,
        });

        return { ...task };
    }

    private isValidStatusTransition(oldStatus: TaskStatus, newStatus: TaskStatus): boolean {
        if (oldStatus === "todo") {
            return newStatus === "in-progress";
        } else if (oldStatus === "in-progress") {
            return newStatus === "done";
        } else if (oldStatus === "done") {
            return false; // Cannot transition from 'done'
        }
        return false; // Should not happen
    }
}
