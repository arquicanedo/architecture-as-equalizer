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
    private tasks: Map<string, Task>;

    constructor() {
        this.tasks = new Map();
    }

    /**
     * Creates a new task.
     * @param title The title of the task.
     * @param description The description of the task.
     * @param projectId The ID of the project the task belongs to.
     * @returns The created task.
     */
    create(title: string, description: string, projectId: string): Task {
        if (!title || !projectId) {
            throw new Error('Title and Project ID are required to create a task.');
        }
        const id = randomUUID();
        const newTask: Task = { id, title, description, status: 'todo', assigneeId: null, projectId };
        this.tasks.set(id, newTask);
        return newTask;
    }

    /**
     * Retrieves a task by its ID.
     * @param id The ID of the task.
     * @returns The task, or undefined if not found.
     */
    getById(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    /**
     * Retrieves all tasks for a given project.
     * @param projectId The ID of the project.
     * @returns An array of tasks belonging to the project.
     */
    getByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    /**
     * Updates an existing task.
     * @param id The ID of the task to update.
     * @param updates An object containing the fields to update (title, description).
     * @returns The updated task, or undefined if the task was not found.
     */
    update(id: string, updates: { title?: string; description?: string }): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            if (updates.title !== undefined) task.title = updates.title;
            if (updates.description !== undefined) task.description = updates.description;
            this.tasks.set(id, task);
            return task;
        }
        return undefined;
    }

    /**
     * Deletes a task by its ID.
     * @param id The ID of the task to delete.
     * @returns True if the task was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.tasks.delete(id);
    }

    /**
     * Assigns a task to a user.
     * Publishes 'task.assigned' event.
     * @param taskId The ID of the task.
     * @param assigneeId The ID of the user to assign the task to.
     * @returns The updated task, or undefined if the task was not found.
     */
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

    /**
     * Changes the status of a task.
     * Status transitions: 'todo' -> 'in-progress' -> 'done'.
     * Publishes 'task.statusChanged' event.
     * @param taskId The ID of the task.
     * @param newStatus The new status to set.
     * @returns The updated task, or undefined if the task was not found or transition is invalid.
     * @throws Error if the status transition is invalid.
     */
    changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(taskId);
        if (task) {
            const oldStatus = task.status;
            if (oldStatus === newStatus) {
                return task; // No change needed
            }

            // Validate status transitions
            if (
                (oldStatus === 'todo' && newStatus === 'in-progress') ||
                (oldStatus === 'in-progress' && newStatus === 'done')
            ) {
                task.status = newStatus;
                this.tasks.set(taskId, task);
                eventBus.publish('task.statusChanged', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId, oldStatus, newStatus });
                return task;
            } else {
                throw new Error(`Invalid status transition from '${oldStatus}' to '${newStatus}' for task ${taskId}`);
            }
        }
        return undefined;
    }
}

export const taskService = new TaskService();
