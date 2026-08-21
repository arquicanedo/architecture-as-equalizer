/**
 * Task Service - Manages tasks within projects with status validation
 */

import { eventBus } from './event-bus';
import { projectService } from './project-service';
import { userService } from './user-service';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string | null; // User ID
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];

function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  return fromIndex < toIndex;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private nextId = 1;

  /**
   * Create a new task
   */
  createTask(
    projectId: string,
    title: string,
    description: string
  ): Task | null {
    // Verify project exists
    if (!projectService.projectExists(projectId)) return null;

    const id = `task-${this.nextId++}`;
    const task: Task = {
      id,
      projectId,
      title,
      description,
      status: 'todo',
      assignee: null,
    };
    this.tasks.set(id, task);

    eventBus.publish('task.created', {
      taskId: id,
      projectId,
      title,
    });

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

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;

    return task;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Transition task status with validation
   */
  updateStatus(id: string, newStatus: TaskStatus): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    if (task.status === newStatus) {
      return task; // No change needed
    }

    if (!canTransition(task.status, newStatus)) {
      return null; // Invalid transition
    }

    const oldStatus = task.status;
    task.status = newStatus;

    eventBus.publish('task.status-changed', {
      taskId: id,
      projectId: task.projectId,
      oldStatus,
      newStatus,
      assignee: task.assignee,
    });

    return task;
  }

  /**
   * Assign a task to a user
   */
  assignTask(id: string, userId: string): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    // Verify user exists
    if (!userService.userExists(userId)) return null;

    const previousAssignee = task.assignee;
    task.assignee = userId;

    eventBus.publish('task.assigned', {
      taskId: id,
      projectId: task.projectId,
      assignee: userId,
      previousAssignee,
    });

    return task;
  }

  /**
   * Check if a task exists
   */
  taskExists(id: string): boolean {
    return this.tasks.has(id);
  }
}

export const taskService = new TaskService();
