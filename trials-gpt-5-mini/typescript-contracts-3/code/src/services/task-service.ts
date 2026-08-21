import { Task, ITaskService, TaskStatus, TaskAssignedPayload, TaskStatusChangedPayload } from "../types";
import { randomUUID } from "crypto";
import { IEventBus } from "../types";

export class TaskService implements ITaskService {
  private tasks: Map<string, Task> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = randomUUID();
    const task: Task = { id, title: input.title, description: input.description, status: "todo", assigneeId: null, projectId: input.projectId };
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
    const t = this.getById(id);
    const updated: Task = { ...t, ...input } as Task;
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.tasks.delete(id)) throw new Error("Task not found");
  }

  assign(taskId: string, assigneeId: string): Task {
    const t = this.getById(taskId);
    t.assigneeId = assigneeId;
    this.tasks.set(taskId, t);
    const payload: TaskAssignedPayload = { taskId: t.id, taskTitle: t.title, assigneeId };
    this.eventBus.publish("task.assigned", payload);
    return t;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const t = this.getById(taskId);
    const order: TaskStatus[] = ["todo", "in-progress", "done"];
    const oldIndex = order.indexOf(t.status);
    const newIndex = order.indexOf(newStatus);
    if (newIndex === -1) throw new Error("Invalid status");
    // enforce forward-only and no skipping
    if (newIndex <= oldIndex) throw new Error("Invalid status transition: must move forward");
    if (newIndex - oldIndex !== 1) throw new Error("Invalid status transition: cannot skip states");

    const oldStatus = t.status;
    t.status = newStatus;
    this.tasks.set(taskId, t);

    const payload: TaskStatusChangedPayload = { taskId: t.id, taskTitle: t.title, assigneeId: t.assigneeId, oldStatus, newStatus };
    this.eventBus.publish("task.statusChanged", payload);
    return t;
  }
}
