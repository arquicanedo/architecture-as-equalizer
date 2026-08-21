/**
 * Task Service - Manages tasks with status transitions
 */

import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string | null; // User ID
  createdAt: number;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private statusOrder: TaskStatus[] = ['todo', 'in-progress', 'done'];

  constructor(private eventBus: EventBus) {}

  /**
   * Create a new task
   */
  createTask(
    projectId: string,
    title: string,
    description: string
  ): Task {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title,
      description,
      status: 'todo',
      assignee: null,
      createdAt: Date.now(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks for a specific project
   */
  getTasksByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  /**
   * Update a task
   */
  updateTask(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated: Task = {
      ...task,
      ...updates,
      id: task.id, // Ensure ID doesn't change
      projectId: task.projectId, // Ensure project ID doesn't change
      createdAt: task.createdAt, // Ensure creation time doesn't change
    };
    this.tasks.set(id, updated);
    return updated;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Validate and update task status
   * Status transitions: todo -> in-progress -> done
   */
  updateTaskStatus(id: string, newStatus: TaskStatus): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const currentIndex = this.statusOrder.indexOf(task.status);
    const newIndex = this.statusOrder.indexOf(newStatus);

    if (newIndex < currentIndex) {
      throw new Error(
        `Cannot transition from '${task.status}' to '${newStatus}'. Can only move forward in status.`
      );
    }

    const updated = this.updateTask(id, { status: newStatus });
    
    if (updated) {
      this.eventBus.publish('task.status-changed', {
        taskId: id,
        oldStatus: task.status,
        newStatus: newStatus,
        assignee: updated.assignee,
      });
    }

    return updated;
  }

  /**
   * Assign a task to a user
   */
  assignTask(id: string, userId: string): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated = this.updateTask(id, { assignee: userId });
    
    if (updated) {
      this.eventBus.publish('task.assigned', {
        taskId: id,
        userId: userId,
        taskTitle: updated.title,
      });
    }

    return updated;
  }

  /**
   * Unassign a task
   */
  unassignTask(id: string): Task | null {
    return this.updateTask(id, { assignee: null });
  }
}
