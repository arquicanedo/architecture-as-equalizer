import { Task, TaskStatus, UUID } from '../types';
import { uuid } from '../utils';
import { EventBus } from '../event-bus';

export class TaskService {
  private store: Map<UUID, Task> = new Map();
  constructor(private bus: EventBus) {}

  create(payload: { title: string; description?: string; projectId: string; assigneeId?: string | null }): Task {
    const id = uuid();
    const task: Task = {
      id,
      title: payload.title,
      description: payload.description ?? '',
      status: 'todo',
      assigneeId: payload.assigneeId ?? null,
      projectId: payload.projectId,
    };
    this.store.set(id, task);
    if (task.assigneeId) {
      this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
    }
    return task;
  }

  getById(id: UUID): Task | null {
    return this.store.get(id) ?? null;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(t => t.projectId === projectId);
  }

  update(id: UUID, payload: { title?: string; description?: string }): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const updated: Task = { ...t, ...payload };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: UUID): boolean {
    return this.store.delete(id);
  }

  assign(id: UUID, assigneeId: string | null): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    t.assigneeId = assigneeId;
    this.store.set(id, t);
    this.bus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
    return t;
  }

  changeStatus(id: UUID, newStatus: TaskStatus): Task | { error: string } | null {
    const t = this.store.get(id);
    if (!t) return null;
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const oldIdx = order.indexOf(t.status);
    const newIdx = order.indexOf(newStatus);
    if (newIdx === -1) return { error: 'invalid status' };
    if (newIdx < oldIdx) return { error: 'status transition must be forward only' };
    if (newIdx === oldIdx) return t;
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(id, t);
    this.bus.publish('task.statusChanged', { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus });
    return t;
  }
}
