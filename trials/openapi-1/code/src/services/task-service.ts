// ============================================================
// Task Service
// Owns the in-memory task store.
// Publishes events to the Event Bus; never imports other services.
// ============================================================

import { randomUUID } from 'crypto';
import {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  ServiceResult,
  ok,
  fail,
} from '../types.js';
import {
  eventBus,
  Events,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from '../event-bus.js';

// Forward-only status transitions (ADR constraint #4).
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  'todo': 'in-progress',
  'in-progress': 'done',
  'done': null,
};

class TaskService {
  private readonly store = new Map<string, Task>();

  listByProject(projectId: string): ServiceResult<Task[]> {
    const tasks = Array.from(this.store.values()).filter(
      (t) => t.projectId === projectId,
    );
    return ok(tasks);
  }

  getTask(id: string): ServiceResult<Task> {
    const task = this.store.get(id);
    if (!task) return fail(404, `Task "${id}" not found`);
    return ok(task);
  }

  createTask(input: CreateTaskInput): ServiceResult<Task> {
    if (!input.title?.trim()) return fail(400, 'Field "title" is required');
    if (input.description === undefined || input.description === null)
      return fail(400, 'Field "description" is required');
    if (!input.projectId?.trim())
      return fail(400, 'Field "projectId" is required');

    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description,
      status: 'todo',
      assigneeId: null,
      projectId: input.projectId.trim(),
    };
    this.store.set(task.id, task);
    return ok(task);
  }

  updateTask(id: string, input: UpdateTaskInput): ServiceResult<Task> {
    const existing = this.store.get(id);
    if (!existing) return fail(404, `Task "${id}" not found`);

    const updated: Task = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    };
    this.store.set(id, updated);
    return ok(updated);
  }

  deleteTask(id: string): ServiceResult<void> {
    if (!this.store.has(id)) return fail(404, `Task "${id}" not found`);
    this.store.delete(id);
    return ok(undefined);
  }

  changeStatus(id: string, newStatus: TaskStatus): ServiceResult<Task> {
    const task = this.store.get(id);
    if (!task) return fail(404, `Task "${id}" not found`);

    const allowedNext = VALID_TRANSITIONS[task.status];
    if (allowedNext !== newStatus) {
      return fail(
        400,
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `Allowed next status: ${allowedNext ?? '(none — task is already done)'}`,
      );
    }

    const oldStatus = task.status;
    const updated: Task = { ...task, status: newStatus };
    this.store.set(id, updated);

    // Notify subscribers — only if there is an assignee to notify.
    if (updated.assigneeId) {
      const payload: TaskStatusChangedPayload = {
        taskId: updated.id,
        taskTitle: updated.title,
        assigneeId: updated.assigneeId,
        oldStatus,
        newStatus,
      };
      eventBus.publish(Events.TASK_STATUS_CHANGED, payload);
    }

    return ok(updated);
  }

  assignTask(id: string, assigneeId: string): ServiceResult<Task> {
    const task = this.store.get(id);
    if (!task) return fail(404, `Task "${id}" not found`);

    const updated: Task = { ...task, assigneeId };
    this.store.set(id, updated);

    const payload: TaskAssignedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
    };
    eventBus.publish(Events.TASK_ASSIGNED, payload);

    return ok(updated);
  }
}

export const taskService = new TaskService();
