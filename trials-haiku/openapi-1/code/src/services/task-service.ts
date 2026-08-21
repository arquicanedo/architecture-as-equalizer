/**
 * Task Service
 * Manages task data and operations.
 * Publishes events for task status changes and assignments.
 */

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

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
}

class TaskService {
  private store: Map<string, Task> = new Map();

  /**
   * Get all tasks for a project.
   */
  getTasksByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(t => t.projectId === projectId);
  }

  /**
   * Get a task by ID.
   */
  getTaskById(id: string): Task | undefined {
    return this.store.get(id);
  }

  /**
   * Create a new task.
   */
  createTask(input: CreateTaskInput): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: null,
      projectId: input.projectId,
    };
    this.store.set(task.id, task);
    return task;
  }

  /**
   * Update task title and description.
   * Returns the updated task or undefined if not found.
   */
  updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    if (input.title !== undefined) task.title = input.title;
    if (input.description !== undefined) task.description = input.description;

    this.store.set(id, task);
    return task;
  }

  /**
   * Delete a task.
   * Returns true if deleted, false if not found.
   */
  deleteTask(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Change task status with forward-only validation.
   * Valid transitions: todo -> in-progress -> done
   * Returns the updated task or undefined if not found.
   * Throws an error if the transition is invalid.
   */
  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const oldStatus = task.status;

    // Validate forward-only transitions
    if (oldStatus === newStatus) {
      return task; // No change needed
    }

    const isValidTransition =
      (oldStatus === 'todo' && newStatus === 'in-progress') ||
      (oldStatus === 'in-progress' && newStatus === 'done');

    if (!isValidTransition) {
      throw new Error(
        `Invalid status transition from "${oldStatus}" to "${newStatus}". Only forward transitions are allowed (todo -> in-progress -> done).`
      );
    }

    task.status = newStatus;
    this.store.set(id, task);

    // Publish event for status change
    eventBus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });

    return task;
  }

  /**
   * Assign a task to a user.
   * Returns the updated task or undefined if not found.
   */
  assignTask(id: string, assigneeId: string): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const previousAssigneeId = task.assigneeId;
    task.assigneeId = assigneeId;
    this.store.set(id, task);

    // Only publish event if assignment changed
    if (previousAssigneeId !== assigneeId) {
      eventBus.publish('task.assigned', {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId,
      });
    }

    return task;
  }
}

export const taskService = new TaskService();
