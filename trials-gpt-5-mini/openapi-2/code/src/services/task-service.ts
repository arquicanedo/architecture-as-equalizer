import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../types';
import { eventBus } from '../event-bus';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class TaskService {
  private store: Map<string, Task> = new Map();

  listByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }

  create(input: CreateTaskInput): Task {
    const id = genId();
    const task: Task = { id, title: input.title, description: input.description, status: 'todo', assigneeId: null, projectId: input.projectId };
    this.store.set(id, task);
    return task;
  }

  get(id: string): Task | null {
    return this.store.get(id) || null;
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const updated = { ...t, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    t.assigneeId = assigneeId;
    this.store.set(id, t);
    // publish event
    eventBus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
    return t;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const order = ['todo', 'in-progress', 'done'];
    const oldIdx = order.indexOf(t.status);
    const newIdx = order.indexOf(newStatus);
    if (newIdx === -1) return null;
    if (newIdx < oldIdx) {
      throw new Error('Invalid status transition');
    }
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(id, t);
    eventBus.publish('task.statusChanged', { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus });
    return t;
  }
}
