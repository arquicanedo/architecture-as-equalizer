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
  private store: Map<string, Task> = new Map();
  constructor(private bus: EventBus) {}

  create(input: { title: string; description?: string; projectId: string; assigneeId?: string }): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      assigneeId: input.assigneeId,
      status: 'todo',
    };
    this.store.set(task.id, task);
    if (task.assigneeId) {
      this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId });
    }
    return task;
  }

  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  getAll(): Task[] {
    return Array.from(this.store.values());
  }

  update(id: string, updates: Partial<Omit<Task, 'id'>>): Task | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const prevAssignee = existing.assigneeId;
    const prevStatus = existing.status;
    const updated: Task = { ...existing, ...updates, id: existing.id };
    this.store.set(id, updated);
    if (updates.assigneeId && updates.assigneeId !== prevAssignee) {
      this.bus.publish('task.assigned', { taskId: updated.id, taskTitle: updated.title, assigneeId: updates.assigneeId });
    }
    if (updates.status && updates.status !== prevStatus) {
      this.bus.publish('task.statusChanged', {
        taskId: updated.id,
        taskTitle: updated.title,
        assigneeId: updated.assigneeId,
        oldStatus: prevStatus,
        newStatus: updates.status,
      });
    }
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId });
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;
    const allowed: Record<TaskStatus, TaskStatus | null> = {
      'todo': 'in-progress',
      'in-progress': 'done',
      'done': null,
    };
    const next = allowed[task.status];
    if (next !== newStatus) {
      // Only allow forward one step transitions
      return undefined;
    }
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

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }
}
