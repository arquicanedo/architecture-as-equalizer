import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string; // user id
  projectId: string;
};

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  constructor(private eventBus: EventBus) {}

  createTask(title: string, projectId: string, description?: string): Task {
    const id = randomUUID();
    const task: Task = { id, title, description, status: 'todo', projectId };
    this.tasks.set(id, task);
    this.eventBus.publish('task.created', { task });
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, data: Partial<Omit<Task, 'id' | 'projectId'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.tasks.set(id, updated);
    this.eventBus.publish('task.updated', { task: updated });
    return updated;
  }

  deleteTask(id: string): boolean {
    const t = this.tasks.get(id);
    if (!t) return false;
    this.tasks.delete(id);
    this.eventBus.publish('task.deleted', { task: t });
    return true;
  }

  listTasks(filter?: { projectId?: string }): Task[] {
    let res = Array.from(this.tasks.values());
    if (filter?.projectId) res = res.filter((t) => t.projectId === filter.projectId);
    return res;
  }

  setStatus(id: string, status: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    // validate transition
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const from = order.indexOf(task.status);
    const to = order.indexOf(status);
    if (to === -1) return undefined;
    if (to < from) throw new Error(`Invalid status transition from ${task.status} to ${status}`);
    task.status = status;
    this.tasks.set(id, task);
    this.eventBus.publish('task.status_changed', { task });
    return task;
  }

  assign(id: string, userId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assignee = userId;
    this.tasks.set(id, task);
    this.eventBus.publish('task.assigned', { task });
    return task;
  }
}
