import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus.js';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
};

export class TaskService {
  private store: Map<string, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(data: { title: string; description?: string; projectId: string; assigneeId?: string | null }): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title: data.title,
      description: data.description ?? '',
      status: 'todo',
      assigneeId: data.assigneeId ?? null,
      projectId: data.projectId,
    };
    this.store.set(id, task);
    return task;
  }

  getById(id: string): Task | null {
    return this.store.get(id) ?? null;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, data: Partial<Omit<Task, 'id' | 'projectId'>>): Task | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  assign(id: string, assigneeId: string | null): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    t.assigneeId = assigneeId;
    this.store.set(id, t);
    // publish
    this.bus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
    return t;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const oldIndex = order.indexOf(t.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) return null;
    if (newIndex < oldIndex) {
      // disallow backward
      return null;
    }
    if (newIndex === oldIndex) return t;
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(id, t);
    this.bus.publish('task.statusChanged', { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus });
    return t;
  }
}
