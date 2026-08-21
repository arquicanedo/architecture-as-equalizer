import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string; // user id
  projectId: string;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();

  constructor(private bus: EventBus) {}

  create(title: string, description: string, projectId: string, assignee?: string): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title,
      description,
      status: 'todo',
      assignee,
      projectId,
    };
    this.tasks.set(id, task);
    if (assignee) {
      this.bus.emit('task.assigned', { taskId: id, assignee });
    }
    this.bus.emit('task.created', { taskId: id, projectId });
    return task;
  }

  list(filter?: { projectId?: string }): Task[] {
    let list = Array.from(this.tasks.values());
    if (filter?.projectId) list = list.filter((t) => t.projectId === filter.projectId);
    return list;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  update(id: string, updates: Partial<Omit<Task, 'id' | 'status'>>): Task | undefined {
    const current = this.tasks.get(id);
    if (!current) return undefined;
    const prevAssignee = current.assignee;
    const updated: Task = { ...current, ...updates };
    this.tasks.set(id, updated);
    if (updates.assignee && updates.assignee !== prevAssignee) {
      this.bus.emit('task.assigned', { taskId: id, assignee: updates.assignee });
    }
    this.bus.emit('task.updated', { taskId: id });
    return updated;
  }

  delete(id: string): boolean {
    const existed = this.tasks.delete(id);
    if (existed) this.bus.emit('task.deleted', { taskId: id });
    return existed;
  }

  setStatus(id: string, nextStatus: TaskStatus): Task | undefined {
    const current = this.tasks.get(id);
    if (!current) return undefined;
    const allowed: Record<TaskStatus, TaskStatus[]> = {
      'todo': ['in-progress'],
      'in-progress': ['done'],
      'done': [],
    };
    if (!allowed[current.status].includes(nextStatus)) {
      throw new Error(`Invalid status transition from ${current.status} to ${nextStatus}`);
    }
    current.status = nextStatus;
    this.tasks.set(id, current);
    this.bus.emit('task.statusChanged', { taskId: id, status: nextStatus, assignee: current.assignee });
    return current;
  }

  assign(id: string, userId: string): Task | undefined {
    const current = this.tasks.get(id);
    if (!current) return undefined;
    current.assignee = userId;
    this.tasks.set(id, current);
    this.bus.emit('task.assigned', { taskId: id, assignee: userId });
    return current;
  }
}
