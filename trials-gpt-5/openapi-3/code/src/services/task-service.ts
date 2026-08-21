import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

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
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  listTasksByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }

  createTask(input: CreateTaskInput): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: 'todo',
      projectId: input.projectId,
      assigneeId: null,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  assignTask(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId });
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const allowedOrder: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const currentIndex = allowedOrder.indexOf(task.status);
    const newIndex = allowedOrder.indexOf(newStatus);
    if (newIndex === -1 || newIndex < currentIndex) {
      throw new Error('Invalid status transition');
    }
    const oldStatus = task.status;
    task.status = newStatus;
    this.tasks.set(id, task);
    this.bus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId || null,
      oldStatus,
      newStatus,
    });
    return task;
  }
}
