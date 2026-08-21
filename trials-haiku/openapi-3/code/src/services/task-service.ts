/**
 * Task Service
 * Manages tasks independently and publishes events
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
  private store: Map<string, Task> = new Map();
  private idCounter: number = 0;

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `task_${++this.idCounter}`;
  }

  /**
   * Valid status transitions
   */
  private isValidTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const transitions: Record<TaskStatus, TaskStatus[]> = {
      'todo': ['in-progress'],
      'in-progress': ['done'],
      'done': [],
    };
    return transitions[currentStatus].includes(newStatus);
  }

  /**
   * List tasks by project
   */
  listTasksByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(task => task.projectId === projectId);
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | null {
    return this.store.get(id) || null;
  }

  /**
   * Create a new task
   */
  createTask(input: CreateTaskInput): Task {
    const task: Task = {
      id: this.generateId(),
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
   * Update a task (title and description only)
   */
  updateTask(id: string, input: UpdateTaskInput): Task | null {
    const task = this.store.get(id);
    if (!task) return null;

    const updated: Task = {
      ...task,
      title: input.title ?? task.title,
      description: input.description ?? task.description,
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Change task status (forward-only transitions)
   */
  changeStatus(id: string, newStatus: TaskStatus): Task | null {
    const task = this.store.get(id);
    if (!task) return null;

    if (!this.isValidTransition(task.status, newStatus)) {
      return null; // Invalid transition
    }

    const oldStatus = task.status;
    task.status = newStatus;

    // Publish event
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
   * Assign task to a user
   */
  assignTask(id: string, assigneeId: string): Task | null {
    const task = this.store.get(id);
    if (!task) return null;

    task.assigneeId = assigneeId;

    // Publish event
    eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    });

    return task;
  }
}

export const taskService = new TaskService();
