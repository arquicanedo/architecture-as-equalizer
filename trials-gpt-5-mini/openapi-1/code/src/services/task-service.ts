import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string | null;
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
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  listByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }

  create(input: CreateTaskInput): Task {
    const id = randomUUID();
    const task: Task = { id, title: input.title, description: input.description, status: 'todo', assigneeId: null, projectId: input.projectId };
    this.store.set(id, task);
    return task;
  }

  get(id: string): Task | null {
    return this.store.get(id) ?? null;
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const updated: Task = { ...t, title: input.title ?? t.title, description: input.description ?? t.description };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const old = { ...t };
    t.assigneeId = assigneeId;
    this.store.set(id, t);
    // publish event
    this.bus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
    return t;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | null | Error {
    const t = this.store.get(id);
    if (!t) return null;
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const oldIndex = order.indexOf(t.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) return new Error('invalid status');
    if (newIndex < oldIndex) return new Error('invalid status transition');
    if (newIndex === oldIndex) return t; // no change
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(id, t);
    this.bus.publish('task.statusChanged', { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus });
    return t;
  }
}
