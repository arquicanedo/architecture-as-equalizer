/**
 * Task Service: Manages tasks
 * Data: { id, title, description, status, assigneeId, projectId }
 * Status flow: todo → in-progress → done (forward only)
 * Events published: task.assigned, task.statusChanged
 */

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

export class TaskService {
  private store: Map<string, Task> = new Map();
  private idCounter = 0;

  /**
   * Create a new task
   */
  create(
    title: string,
    description: string,
    projectId: string
  ): Task {
    const id = `t${++this.idCounter}`;
    const task: Task = {
      id,
      title,
      description,
      status: 'todo',
      assigneeId: null,
      projectId,
    };
    this.store.set(id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return Array.from(this.store.values());
  }

  /**
   * Get tasks by project
   */
  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      task => task.projectId === projectId
    );
  }

  /**
   * Update a task
   */
  update(
    id: string,
    updates: Partial<Omit<Task, 'id'>>
  ): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const updated = { ...task, ...updates };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a task
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Assign a task to a user
   */
  assign(taskId: string, assigneeId: string): Task | undefined {
    const task = this.store.get(taskId);
    if (!task) return undefined;

    task.assigneeId = assigneeId;
    this.store.set(taskId, task);

    // Publish event for notification service
    eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });

    return task;
  }

  /**
   * Change task status (forward only: todo → in-progress → done)
   */
  changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined {
    const task = this.store.get(taskId);
    if (!task) return undefined;

    const statusOrder: Record<TaskStatus, number> = {
      'todo': 0,
      'in-progress': 1,
      'done': 2,
    };

    // Only allow forward transitions
    if (statusOrder[newStatus] <= statusOrder[task.status]) {
      throw new Error(
        `Cannot transition from ${task.status} to ${newStatus}. Only forward transitions allowed.`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(taskId, task);

    // Publish event for notification service
    eventBus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });

    return task;
  }
}

export const taskService = new TaskService();
