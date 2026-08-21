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
  private tasks: Map<string, Task> = new Map();
  constructor(private eventBus: EventBus) {}

  create(input: { title: string; description: string; projectId: string; assigneeId?: string | null }): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: input.assigneeId ?? null,
      projectId: input.projectId,
    };
    this.tasks.set(id, task);
    if (task.assigneeId) {
      this.eventBus.publish('task.assigned', {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: task.assigneeId,
      });
    }
    return task;
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, patch: Partial<Omit<Task, 'id' | 'status' | 'assigneeId'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...patch, id };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  assign(id: string, assigneeId: string | null): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const currentIndex = order.indexOf(task.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) return undefined;
    if (newIndex < currentIndex) {
      throw new Error('Backward status transitions are not allowed');
    }
    if (newIndex === currentIndex) return task; // no-op

    const oldStatus = task.status;
    task.status = newStatus;
    this.eventBus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });
    return task;
  }
}
