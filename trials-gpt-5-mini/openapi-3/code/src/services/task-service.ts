import { Task, TaskStatus, ID } from '../types';
import { eventBus } from '../event-bus';

export class TaskService {
  private store: Map<ID, Task> = new Map();

  listByProject(projectId: ID): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }

  create(input: { title: string; description: string; projectId: ID }): Task {
    const id = Math.random().toString(36).slice(2, 9);
    const task: Task = { id, status: 'todo', assigneeId: null, ...input } as Task;
    this.store.set(id, task);
    return task;
  }

  get(id: ID): Task | null {
    return this.store.get(id) ?? null;
  }

  update(id: ID, input: { title?: string; description?: string }): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    const updated = { ...t, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: ID): boolean {
    return this.store.delete(id);
  }

  assign(id: ID, assigneeId: ID): Task | null {
    const t = this.store.get(id);
    if (!t) return null;
    t.assigneeId = assigneeId;
    this.store.set(id, t);
    // publish
    eventBus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
    return t;
  }

  changeStatus(id: ID, newStatus: TaskStatus): Task | null | Error {
    const t = this.store.get(id);
    if (!t) return null;
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const oldIndex = order.indexOf(t.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) return new Error('invalid status');
    if (newIndex < oldIndex) return new Error('backwards transition not allowed');
    if (newIndex === oldIndex) return t; // no change
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(id, t);
    eventBus.publish('task.statusChanged', {
      taskId: t.id,
      taskTitle: t.title,
      assigneeId: t.assigneeId,
      oldStatus,
      newStatus,
    });
    return t;
  }
}

export const taskService = new TaskService();
