import { ITaskService, Task, TaskStatus, TaskAssignedPayload, TaskStatusChangedPayload } from "../types";
import { EventBus } from "../event-bus";

const genId = (): string => {
  if (typeof (globalThis as any).crypto?.randomUUID === "function") return (globalThis as any).crypto.randomUUID();
  return "t-" + Math.random().toString(36).slice(2, 10);
};

export class TaskService implements ITaskService {
  private store: Map<string, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = genId();
    const task: Task = { id, title: input.title, description: input.description, status: "todo", assigneeId: null, projectId: input.projectId };
    this.store.set(id, task);
    return task;
  }

  getById(id: string): Task {
    const t = this.store.get(id);
    if (!t) throw new Error("Task not found");
    return t;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const t = this.getById(id);
    const updated = { ...t, ...input } as Task;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.delete(id)) throw new Error("Task not found");
  }

  assign(taskId: string, assigneeId: string): Task {
    const t = this.getById(taskId);
    t.assigneeId = assigneeId;
    this.store.set(taskId, t);
    const payload: TaskAssignedPayload = { taskId: t.id, taskTitle: t.title, assigneeId };
    this.bus.publish("task.assigned", payload);
    return t;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const t = this.getById(taskId);
    const order: TaskStatus[] = ["todo", "in-progress", "done"];
    const oldIndex = order.indexOf(t.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) throw new Error("Invalid status");
    if (newIndex === oldIndex) return t;
    if (newIndex !== oldIndex + 1) throw new Error("Invalid status transition");
    const oldStatus = t.status;
    t.status = newStatus;
    this.store.set(taskId, t);
    const payload: TaskStatusChangedPayload = { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus };
    this.bus.publish("task.statusChanged", payload);
    return t;
  }
}
