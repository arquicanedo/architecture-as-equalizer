/**
 * Task Service - Manages tasks with status transitions
 * Publishes: task.assigned, task.statusChanged
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

export interface CreateTaskRequest {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
}

export interface AssignTaskRequest {
  assigneeId: string | null;
}

export interface ChangeStatusRequest {
  status: TaskStatus;
}

export class TaskService {
  private taskStore: Map<string, Task> = new Map();

  /**
   * Create a new task
   */
  create(req: CreateTaskRequest): Task {
    const task: Task = {
      id: randomUUID(),
      title: req.title,
      description: req.description,
      status: 'todo',
      assigneeId: null,
      projectId: req.projectId,
    };
    this.taskStore.set(task.id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  getById(id: string): Task | undefined {
    return this.taskStore.get(id);
  }

  /**
   * Get all tasks for a project
   */
  getByProject(projectId: string): Task[] {
    return Array.from(this.taskStore.values()).filter(
      task => task.projectId === projectId
    );
  }

  /**
   * Update a task (title/description only)
   */
  update(id: string, req: UpdateTaskRequest): Task | undefined {
    const task = this.taskStore.get(id);
    if (!task) {
      return undefined;
    }
    if (req.title !== undefined) {
      task.title = req.title;
    }
    if (req.description !== undefined) {
      task.description = req.description;
    }
    return task;
  }

  /**
   * Delete a task
   */
  delete(id: string): boolean {
    return this.taskStore.delete(id);
  }

  /**
   * Assign a task to a user
   */
  assign(id: string, req: AssignTaskRequest): Task | undefined {
    const task = this.taskStore.get(id);
    if (!task) {
      return undefined;
    }
    const oldAssigneeId = task.assigneeId;
    task.assigneeId = req.assigneeId;

    // Publish task.assigned event if assigning to someone
    if (req.assigneeId) {
      eventBus.publish('task.assigned', {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: req.assigneeId,
      });
    }

    return task;
  }

  /**
   * Change task status with forward-only validation
   * Allowed transitions: todo -> in-progress -> done
   */
  changeStatus(id: string, req: ChangeStatusRequest): Task | undefined {
    const task = this.taskStore.get(id);
    if (!task) {
      return undefined;
    }

    // Validate forward-only transition
    const statusOrder: Record<TaskStatus, number> = {
      'todo': 0,
      'in-progress': 1,
      'done': 2,
    };

    if (statusOrder[req.status] <= statusOrder[task.status]) {
      throw new Error(
        `Invalid status transition: ${task.status} -> ${req.status}. Only forward transitions allowed.`
      );
    }

    const oldStatus = task.status;
    task.status = req.status;

    // Publish task.statusChanged event if task has an assignee
    if (task.assigneeId) {
      eventBus.publish('task.statusChanged', {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: task.assigneeId,
        oldStatus,
        newStatus: req.status,
      });
    }

    return task;
  }
}

export const taskService = new TaskService();
