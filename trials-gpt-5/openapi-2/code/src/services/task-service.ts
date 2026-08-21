import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string | null;
  projectId: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();

  listByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }

  create(input: CreateTaskInput): Task {
    const id = randomUUID();
    const task: Task = { id, title: input.title, description: input.description, status: 'todo', projectId: input.projectId, assigneeId: null };
    this.tasks.set(id, task);
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const current = task.status;
    // enforce forward-only transitions: todo -> in-progress -> done
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const currentIndex = order.indexOf(current);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1 || newIndex < currentIndex || newIndex - currentIndex > 1) {
      throw new Error('Invalid status transition');
    }
    task.status = newStatus;
    this.tasks.set(id, task);
    eventBus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId ?? null,
      oldStatus: current,
      newStatus: newStatus,
    });
    return task;
  }

  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: assigneeId,
    });
    return task;
  }
}
