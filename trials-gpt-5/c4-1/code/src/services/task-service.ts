import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

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

  constructor(private eventBus: EventBus) {}

  create(input: Omit<Task, 'id' | 'status' | 'assigneeId'> & { status?: TaskStatus; assigneeId?: string | null }): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      status: input.status ?? 'todo',
      assigneeId: input.assigneeId ?? null,
    };
    this.store.set(id, task);
    return task;
  }

  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }

  getAll(): Task[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<Omit<Task, 'id'>>): Task | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const merged: Task = { ...existing, ...input, id };
    // Enforce forward-only status transitions if status provided
    if (input.status && existing.status !== input.status) {
      if (!this.isForwardTransition(existing.status, input.status)) {
        throw new Error('Invalid status transition');
      }
    }
    this.store.set(id, merged);
    return merged;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  assign(id: string, assigneeId: string | null): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.store.set(id, task);
    if (assigneeId) {
      this.eventBus.publish('task.assigned', { taskId: id, taskTitle: task.title, assigneeId });
    }
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;
    const oldStatus = task.status;
    if (oldStatus === newStatus) return task;
    if (!this.isForwardTransition(oldStatus, newStatus)) {
      throw new Error('Invalid status transition');
    }
    task.status = newStatus;
    this.store.set(id, task);
    this.eventBus.publish('task.statusChanged', {
      taskId: id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });
    return task;
  }

  private isForwardTransition(oldStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    return order.indexOf(newStatus) >= order.indexOf(oldStatus);
  }
}
