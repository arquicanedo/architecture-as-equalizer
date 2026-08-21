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
  constructor(private bus: EventBus) {}

  create(input: { title: string; description: string; projectId: string; assigneeId?: string | null }): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: input.assigneeId ?? null,
      projectId: input.projectId,
    };
    this.store.set(task.id, task);
    if (task.assigneeId) {
      this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
    }
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

  update(id: string, input: Partial<Omit<Task, 'id' | 'status' | 'projectId'>>): Task | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input, id };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  assign(id: string, assigneeId: string | null): Task | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    existing.assigneeId = assigneeId;
    this.store.set(id, existing);
    if (assigneeId) {
      this.bus.publish('task.assigned', { taskId: existing.id, taskTitle: existing.title, assigneeId });
    }
    return existing;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const oldStatus = existing.status;
    if (!this.isForwardTransition(oldStatus, newStatus)) {
      return undefined;
    }
    existing.status = newStatus;
    this.store.set(id, existing);
    this.bus.publish('task.statusChanged', {
      taskId: existing.id,
      taskTitle: existing.title,
      assigneeId: existing.assigneeId,
      oldStatus,
      newStatus,
    });
    return existing;
  }

  private isForwardTransition(oldStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    return order.indexOf(newStatus) >= order.indexOf(oldStatus);
  }
}
