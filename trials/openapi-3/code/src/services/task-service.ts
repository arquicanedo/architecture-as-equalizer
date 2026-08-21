import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus.js';
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from '../types.js';

// ─── Task Service ─────────────────────────────────────────────────────────────
// Owns the task store exclusively. Publishes events to the Event Bus for
// cross-service communication. Does NOT call other services directly.

/** Forward-only status transition table */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in-progress'],
  'in-progress': ['done'],
  done: [],
};

export type ChangeStatusResult =
  | { ok: true; task: Task }
  | { ok: false; reason: 'not_found' | 'invalid_transition' };

class TaskService {
  private store: Map<string, Task> = new Map();

  listByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      (t) => t.projectId === projectId,
    );
  }

  getTask(id: string): Task | undefined {
    return this.store.get(id);
  }

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

  updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
    };
    this.store.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    return this.store.delete(id);
  }

  changeStatus(id: string, newStatus: TaskStatus): ChangeStatusResult {
    const task = this.store.get(id);
    if (!task) return { ok: false, reason: 'not_found' };

    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) {
      return { ok: false, reason: 'invalid_transition' };
    }

    const oldStatus = task.status;
    const updated: Task = { ...task, status: newStatus };
    this.store.set(id, updated);

    // Publish status-change event so NotificationService can react
    const payload: TaskStatusChangedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      oldStatus,
      newStatus,
    };
    eventBus.publish('task.statusChanged', payload);

    return { ok: true, task: updated };
  }

  assignTask(id: string, assigneeId: string): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const updated: Task = { ...task, assigneeId };
    this.store.set(id, updated);

    // Publish assignment event so NotificationService can react
    const payload: TaskAssignedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
    };
    eventBus.publish('task.assigned', payload);

    return updated;
  }
}

export const taskService = new TaskService();
