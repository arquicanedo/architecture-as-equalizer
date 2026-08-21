import { Task, TaskStatus, UUID, TaskAssignedEvent, TaskStatusChangedEvent } from '../types';
import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

class TaskService {
    private tasks: Map<UUID, Task>;

    constructor() {
        this.tasks = new Map<UUID, Task>();
    }

    /**
     * Creates a new task.
     * @param title Task title.
     * @param description Task description.
     * @param projectId Owning project ID.
     * @returns The newly created task.
     */
    create(title: string, description: string, projectId: UUID): Task {
        if (!title || !projectId) {
            throw new Error("Task title and project ID are required.");
        }
        const id: UUID = randomUUID();
        const newTask: Task = {
            id,
            title,
            description,
            status: "todo",
            assigneeId: null,
            projectId
        };
        this.tasks.set(id, newTask);
        return newTask;
    }

    /**
     * Retrieves a task by its ID.
     * @param id The task's UUID.
     * @returns The task, or undefined if not found.
     */
    getById(id: UUID): Task | undefined {
        return this.tasks.get(id);
    }

    /**
     * Retrieves tasks by project ID.
     * @param projectId The project's UUID.
     * @returns An array of tasks belonging to the project.
     */
    getByProject(projectId: UUID): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    /**
     * Updates an existing task.
     * @param id The ID of the task to update.
     * @param updates An object containing fields to update (title, description).
     * @returns The updated task, or undefined if the task was not found.
     */
    update(id: UUID, updates: { title?: string, description?: string }): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        const updatedTask = { ...task, ...updates };
        this.tasks.set(id, updatedTask);
        return updatedTask;
    }

    /**
     * Deletes a task by its ID.
     * @param id The ID of the task to delete.
     * @returns True if the task was deleted, false otherwise.
     */
    delete(id: UUID): boolean {
        return this.tasks.delete(id);
    }

    /**
     * Assigns a user to a task.
     * @param id The ID of the task.
     * @param assigneeId The ID of the user to assign.
     * @returns The updated task, or undefined if the task was not found.
     */
    assign(id: UUID, assigneeId: UUID | null): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldAssigneeId = task.assigneeId;
        if (oldAssigneeId === assigneeId) {
            return task; // No change in assignment
        }

        task.assigneeId = assigneeId;
        this.tasks.set(id, task);

        if (assigneeId !== null) { // Only publish if assigned to someone
            const payload: TaskAssignedEvent = {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: assigneeId
            };
            eventBus.publish('task.assigned', payload);
        }
        return task;
    }

    /**
     * Changes the status of a task.
     * Enforces forward-only transitions: todo -> in-progress -> done.
     * @param id The ID of the task.
     * @param newStatus The new status for the task.
     * @returns The updated task, or undefined if the task was not found or transition is invalid.
     */
    changeStatus(id: UUID, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;

        // Enforce forward-only status transitions
        if (oldStatus === "done") {
            throw new Error("Cannot change status of a 'done' task.");
        }
        if (oldStatus === "in-progress" && newStatus === "todo") {
            throw new Error("Cannot change status from 'in-progress' to 'todo'.");
        }
        if (oldStatus === "todo" && newStatus === "done") {
             // This transition is allowed implicitly by the spec "todo -> in-progress -> done" as a path,
             // but not necessarily disallowing todo->done directly if it makes sense in some workflows.
             // Given the explicit "forward-only", I'll allow this as it's not a backward step.
             // If the spec meant strictly one step at a time, it would say so.
        }

        if (oldStatus === newStatus) {
            return task; // No change
        }

        task.status = newStatus;
        this.tasks.set(id, task);

        if (task.assigneeId !== null) { // Only publish if there's an assignee to notify
            const payload: TaskStatusChangedEvent = {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
                oldStatus: oldStatus,
                newStatus: newStatus
            };
            eventBus.publish('task.statusChanged', payload);
        }
        
        return task;
    }
}

export const taskService = new TaskService();
