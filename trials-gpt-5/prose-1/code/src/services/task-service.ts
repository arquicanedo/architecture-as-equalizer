import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string; // user ID
  projectId: string;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();

  constructor(private bus: EventBus) {}

  create(title: string, description: string, projectId: string, assignee?: string): Task {
    const task: Task = { id: randomUUID(), title, description, status: 'todo', projectId, assignee };
    this.tasks.set(task.id, task);
    this.bus.publish('task.created', { task });
    if (assignee) {
      this.bus.publish('task.assigned', { taskId: task.id, assignee, projectId });
    }
    return task;
  }

  list(filter?: { projectId?: string }): Task[] {
    let out = Array.from(this.tasks.values());
    if (filter?.projectId) {
      out = out.filter(t => t.projectId === filter.projectId);
    }
    return out;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  update(id: string, updates: Partial<Omit<Task, 'id' | 'status'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...updates, id: existing.id, status: existing.status };
    this.tasks.set(id, updated);
    this.bus.publish('task.updated', { task: updated });
    return updated;
  }

  delete(id: string): boolean {
    const task = this.tasks.get(id);
    const deleted = this.tasks.delete(id);
    if (deleted && task) {
      this.bus.publish('task.deleted', { task });
    }
    return deleted;
  }

  assign(id: string, assignee: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assignee = assignee;
    this.tasks.set(id, task);
    this.bus.publish('task.assigned', { taskId: id, assignee, projectId: task.projectId });
    return task;
  }

  setStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const currentIndex = order.indexOf(task.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) return undefined;
    if (newIndex < currentIndex || newIndex - currentIndex > 1) {
      // invalid transition
      return undefined;
    }
    task.status = newStatus;
    this.tasks.set(id, task);
    this.bus.publish('task.statusChanged', { taskId: id, status: newStatus, assignee: task.assignee, projectId: task.projectId });
    return task;
  }
}
