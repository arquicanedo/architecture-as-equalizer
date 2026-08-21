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

  create(data: { title: string; description?: string; projectId: string }): Task {
    const task: Task = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
      status: 'todo',
      projectId: data.projectId,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, data: Partial<Omit<Task, 'id'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...data };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.bus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: assigneeId,
    });
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const oldIndex = order.indexOf(task.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) return undefined;
    if (newIndex < oldIndex) return undefined; // forward-only
    if (newIndex === oldIndex) return task; // no change

    const oldStatus = task.status;
    task.status = newStatus;
    this.bus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });
    return task;
  }
}
