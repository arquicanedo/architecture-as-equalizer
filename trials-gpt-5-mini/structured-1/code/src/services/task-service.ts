import { EventBus } from "../event-bus";

export type TaskStatus = "todo" | "in-progress" | "done";
export type Task = { id: string; title: string; description?: string; status: TaskStatus; assigneeId?: string | null; projectId: string };

export class TaskService {
  private store: Map<string, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(task: Task) {
    if (this.store.has(task.id)) throw new Error('Task exists');
    this.store.set(task.id, task);
    return task;
  }

  getById(id: string) {
    return this.store.get(id) ?? null;
  }

  getAll() {
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<Task>) {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id } as Task;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string) {
    return this.store.delete(id);
  }

  assign(taskId: string, assigneeId: string) {
    const t = this.store.get(taskId);
    if (!t) return null;
    t.assigneeId = assigneeId;
    this.store.set(taskId, t);
    // publish event
    this.bus.publish('task.assigned', { taskId: t.id, taskTitle: t.title, assigneeId });
    return t;
  }

  changeStatus(taskId: string, newStatus: TaskStatus) {
    const t = this.store.get(taskId);
    if (!t) return null;
    const order = ["todo", "in-progress", "done"]; 
    const oldIndex = order.indexOf(t.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) throw new Error('Invalid status');
    if (newIndex < oldIndex) throw new Error('Cannot transition backwards');
    if (newIndex === oldIndex) return t;
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(taskId, t);
    this.bus.publish('task.statusChanged', { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus });
    return t;
  }

  getByProject(projectId: string) {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }
}
