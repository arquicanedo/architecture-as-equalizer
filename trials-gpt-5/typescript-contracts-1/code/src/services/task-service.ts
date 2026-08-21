import { randomUUID } from "node:crypto";
import {
  IEventBus,
  ITaskService,
  Task,
  TaskAssignedPayload,
  TaskStatus,
  TaskStatusChangedPayload,
} from "../types";

export class TaskService implements ITaskService {
  // Exclusive in-memory store for tasks
  private tasks: Map<string, Task> = new Map();

  constructor(private bus: IEventBus) {}

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      status: "todo",
      assigneeId: null,
      projectId: input.projectId,
    };
    this.tasks.set(id, task);
    return task;
  }

  getById(id: string): Task {
    const t = this.tasks.get(id);
    if (!t) throw new Error("Task not found");
    return t;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const existing = this.getById(id);
    const updated: Task = { ...existing, ...input } as Task;
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.tasks.has(id)) throw new Error("Task not found");
    this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    const updated: Task = { ...task, assigneeId };
    this.tasks.set(taskId, updated);
    const payload: TaskAssignedPayload = { taskId, taskTitle: updated.title, assigneeId };
    this.bus.publish("task.assigned", payload);
    return updated;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const allowedOrder: TaskStatus[] = ["todo", "in-progress", "done"];
    const currentIndex = allowedOrder.indexOf(task.status);
    const newIndex = allowedOrder.indexOf(newStatus);
    if (newIndex === -1) throw new Error("Invalid status");
    // Enforce forward-only one-step transitions
    if (newIndex !== currentIndex + 1) {
      throw new Error("Invalid status transition: must progress todo → in-progress → done");
    }
    const updated: Task = { ...task, status: newStatus };
    this.tasks.set(taskId, updated);
    const payload: TaskStatusChangedPayload = {
      taskId,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      oldStatus: task.status,
      newStatus,
    };
    this.bus.publish("task.statusChanged", payload);
    return updated;
  }
}
