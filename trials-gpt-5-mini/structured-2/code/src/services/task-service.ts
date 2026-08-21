import { EventBus } from "../event-bus";

export type TaskStatus = "todo" | "in-progress" | "done";
export type Task = { id: string; title: string; description?: string; status: TaskStatus; assigneeId?: string; projectId?: string };

export class TaskService {
  private store: Map<string, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(task: Task): Task {
    if (this.store.has(task.id)) throw new Error('Task exists');
    this.store.set(task.id, task);
    return task;
  }

  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  getAll(): Task[] {
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<Task>): Task {
    const existing = this.store.get(id);
    if (!existing) throw new Error('Not found');
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task {
    const task = this.store.get(id);
    if (!task) throw new Error('Not found');
    task.assigneeId = assigneeId;
    this.store.set(id, task);

    this.bus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId });
    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.store.get(id);
    if (!task) throw new Error('Not found');
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const oldIndex = order.indexOf(task.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) throw new Error('Invalid status');
    if (newIndex < oldIndex) throw new Error('Cannot move status backwards');
    // allow same status? treat as no-op
    if (newIndex === oldIndex) return task;
    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(id, task);
    this.bus.publish('task.statusChanged', { taskId: task.id, taskTitle: task.title, assigneeId: task.assigneeId, oldStatus, newStatus });
    return task;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }
}
