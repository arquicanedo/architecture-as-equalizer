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
  private allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    'todo': ['in-progress'],
    'in-progress': ['done'],
    'done': [],
  };

  constructor(private bus: EventBus) {}

  create(data: Omit<Task, 'id' | 'status'> & { id?: string; status?: TaskStatus }): Task {
    const id = data.id ?? this.generateId();
    const status = data.status ?? 'todo';
    const task: Task = { id, title: data.title, description: data.description ?? '', status, assignee: data.assignee, projectId: data.projectId };
    this.tasks.set(id, task);
    this.bus.emit('task.created', task);
    return task;
  }

  getAll(filter?: { projectId?: string }): Task[] {
    let arr = Array.from(this.tasks.values());
    if (filter?.projectId) arr = arr.filter((t) => t.projectId === filter.projectId);
    return arr;
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  update(id: string, data: Partial<Omit<Task, 'id' | 'projectId'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...data };
    this.tasks.set(id, updated);
    this.bus.emit('task.updated', updated);
    return updated;
  }

  delete(id: string): boolean {
    const existed = this.tasks.delete(id);
    if (existed) this.bus.emit('task.deleted', { id });
    return existed;
  }

  setStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    if (task.status === newStatus) return task;
    const allowed = this.allowedTransitions[task.status] || [];
    if (!allowed.includes(newStatus)) throw new Error(`Invalid status transition from ${task.status} to ${newStatus}`);
    task.status = newStatus;
    this.tasks.set(id, task);
    this.bus.emit('task.status_changed', task);
    return task;
  }

  assign(id: string, userId: string | undefined): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assignee = userId;
    this.tasks.set(id, task);
    this.bus.emit('task.assigned', task);
    return task;
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
