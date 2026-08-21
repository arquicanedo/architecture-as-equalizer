import { Task, ID, TaskStatus } from '../types';
import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export class TaskService {
  private tasks: Map<ID, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  createTask(title: string, projectId: ID, description?: string): Task {
    const id = randomUUID();
    const t: Task = { id, title, description, status: 'todo', assignee: null, projectId };
    this.tasks.set(id, t);
    this.bus.publish('task.created', t);
    return t;
  }

  getTask(id: ID): Task | undefined {
    return this.tasks.get(id);
  }

  listTasks(filter?: { projectId?: ID }): Task[] {
    let arr = Array.from(this.tasks.values());
    if (filter?.projectId) arr = arr.filter((t) => t.projectId === filter.projectId);
    return arr;
  }

  updateTask(id: ID, data: Partial<Omit<Task, 'id' | 'projectId'>>) {
    const t = this.tasks.get(id);
    if (!t) return undefined;
    const updated = { ...t, ...data } as Task;
    this.tasks.set(id, updated);
    this.bus.publish('task.updated', updated);
    return updated;
  }

  deleteTask(id: ID) {
    const t = this.tasks.get(id);
    if (!t) return false;
    this.tasks.delete(id);
    this.bus.publish('task.deleted', { id });
    return true;
  }

  setStatus(id: ID, status: TaskStatus) {
    const t = this.tasks.get(id);
    if (!t) return { ok: false, reason: 'not found' };
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const curIdx = order.indexOf(t.status);
    const newIdx = order.indexOf(status);
    if (newIdx === -1) return { ok: false, reason: 'invalid status' };
    if (newIdx < curIdx) return { ok: false, reason: 'invalid transition' };
    t.status = status;
    this.tasks.set(id, t);
    this.bus.publish('task.status_changed', t);
    return { ok: true, task: t };
  }

  assign(id: ID, userId: ID) {
    const t = this.tasks.get(id);
    if (!t) return { ok: false, reason: 'not found' };
    t.assignee = userId;
    this.tasks.set(id, t);
    this.bus.publish('task.assigned', t);
    return { ok: true, task: t };
  }
}
