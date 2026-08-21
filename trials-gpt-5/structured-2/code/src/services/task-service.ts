import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  projectId: string;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  constructor(private bus: EventBus) {}

  create(data: { title: string; description?: string; projectId: string; assigneeId?: string }): Task {
    const id = randomUUID();
    const task: Task = { id, title: data.title, description: data.description, status: 'todo', assigneeId: data.assigneeId, projectId: data.projectId };
    this.tasks.set(id, task);
    if (task.assigneeId) {
      this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
    }
    return task;
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  update(id: string, data: Partial<Omit<Task, 'id'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...data, id };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: assigneeId });
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const allowed: Record<TaskStatus, TaskStatus | null> = { 'todo': 'in-progress', 'in-progress': 'done', 'done': null };
    const next = allowed[task.status];
    if (task.status === newStatus) return task; // no-op
    if (next !== newStatus) {
      // invalid transition
      return undefined;
    }
    const oldStatus = task.status;
    task.status = newStatus;
    this.tasks.set(id, task);
    this.bus.publish('task.statusChanged', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId, oldStatus, newStatus });
    return task;
  }
}
