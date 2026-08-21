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

  create(data: { title: string; description?: string; projectId: string; assigneeId?: string | null }): Task {
    const task: Task = {
      id: randomUUID(),
      title: data.title,
      description: data.description ?? '',
      status: 'todo',
      assigneeId: data.assigneeId ?? null,
      projectId: data.projectId,
    };
    this.store.set(task.id, task);
    if (task.assigneeId) {
      this.eventBus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
    }
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
    this.eventBus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
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
      // disallow backward transitions
      return null;
    }
    if (newIndex === oldIndex) {
      // no-op
      return t;
    }
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(id, t);
    this.eventBus.publish('task.statusChanged', { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus });
    return t;
  }
}
