/**
 * Task Service - manages tasks within projects
 */

import { eventBus } from './event-bus.js';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
}

const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'todo': ['in-progress', 'done'],
  'in-progress': ['todo', 'done'],
  'done': ['todo', 'in-progress'],
};

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private nextId: number = 1;

  /**
   * Create a new task
   */
  createTask(projectId: string, title: string, description: string): Task {
    const id = `task-${this.nextId++}`;
    const task: Task = {
      id,
      projectId,
      title,
      description,
      status: 'todo',
    };
    this.tasks.set(id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks (optionally filtered by project)
   */
  getAllTasks(projectId?: string): Task[] {
    const allTasks = Array.from(this.tasks.values());
    if (projectId) {
      return allTasks.filter(task => task.projectId === projectId);
    }
    return allTasks;
  }

  /**
   * Update a task
   */
  updateTask(taskId: string, title?: string, description?: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Delete a task
   */
  deleteTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * Assign a task to a user
   */
  assignTask(taskId: string, userId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const oldAssignee = task.assigneeId;
    task.assigneeId = userId;
    this.tasks.set(taskId, task);

    // Publish event for notification service
    eventBus.publish('task.assigned', {
      taskId,
      userId,
      taskTitle: task.title,
      previousAssigneeId: oldAssignee,
    });

    return task;
  }

  /**
   * Change task status with validation
   */
  changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const oldStatus = task.status;

    // Validate status transition
    if (!VALID_STATUS_TRANSITIONS[oldStatus].includes(newStatus)) {
      throw new Error(`Cannot transition from ${oldStatus} to ${newStatus}`);
    }

    task.status = newStatus;
    this.tasks.set(taskId, task);

    // Publish event for notification service
    eventBus.publish('task.statusChanged', {
      taskId,
      oldStatus,
      newStatus,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });

    return task;
  }

  /**
   * Check if a task exists
   */
  taskExists(taskId: string): boolean {
    return this.tasks.has(taskId);
  }
}

export const taskService = new TaskService();
