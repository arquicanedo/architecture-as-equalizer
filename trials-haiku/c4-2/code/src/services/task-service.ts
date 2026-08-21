/**
 * Task Service
 * Manages tasks with status transitions
 */

import { randomUUID } from "crypto";
import { eventBus } from "../event-bus.js";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
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

export interface ChangeStatusInput {
  newStatus: TaskStatus;
}

export interface AssignInput {
  assigneeId: string;
}

export class TaskService {
  private taskStore: Map<string, Task> = new Map();

  /**
   * Create a new task
   */
  create(input: CreateTaskInput): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: "todo",
      assigneeId: null,
      projectId: input.projectId,
    };
    this.taskStore.set(task.id, task);
    return task;
  }

  /**
   * Get task by ID
   */
  getById(id: string): Task | null {
    return this.taskStore.get(id) || null;
  }

  /**
   * Get tasks by project
   */
  getByProject(projectId: string): Task[] {
    return Array.from(this.taskStore.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  /**
   * Update task
   */
  update(id: string, input: UpdateTaskInput): Task | null {
    const task = this.taskStore.get(id);
    if (!task) return null;

    if (input.title !== undefined) task.title = input.title;
    if (input.description !== undefined) task.description = input.description;

    this.taskStore.set(id, task);
    return task;
  }

  /**
   * Delete task
   */
  delete(id: string): boolean {
    return this.taskStore.delete(id);
  }

  /**
   * Assign task to a user
   */
  assign(taskId: string, assigneeId: string): Task | null {
    const task = this.taskStore.get(taskId);
    if (!task) return null;

    const oldAssigneeId = task.assigneeId;
    task.assigneeId = assigneeId;
    this.taskStore.set(taskId, task);

    // Publish event
    eventBus.publish("task.assigned", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });

    return task;
  }

  /**
   * Change task status with validation
   * Forward-only transitions: todo -> in-progress -> done
   */
  changeStatus(taskId: string, input: ChangeStatusInput): Task | null {
    const task = this.taskStore.get(taskId);
    if (!task) return null;

    const statusOrder = ["todo", "in-progress", "done"];
    const currentIndex = statusOrder.indexOf(task.status);
    const newIndex = statusOrder.indexOf(input.newStatus);

    // Only allow forward transitions
    if (newIndex <= currentIndex) {
      throw new Error(
        `Cannot transition from ${task.status} to ${input.newStatus}`
      );
    }

    const oldStatus = task.status;
    task.status = input.newStatus;
    this.taskStore.set(taskId, task);

    // Publish event
    eventBus.publish("task.statusChanged", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus: task.status,
    });

    return task;
  }
}

export const taskService = new TaskService();
