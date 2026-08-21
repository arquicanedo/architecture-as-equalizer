/**
 * Task Service
 * Owns the task data store. Enforces forward-only status transitions.
 * Publishes: task.assigned, task.statusChanged
 * Subscribes to no events.
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string | null;
};

export type UpdateTaskInput = Partial<
  Pick<Task, "title" | "description">
>;

// Defines the valid forward-only progression
const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export class TaskService {
  private store: Map<string, Task> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  create(input: CreateTaskInput): Task {
    if (!input.title) {
      throw new Error("title is required");
    }
    if (!input.projectId) {
      throw new Error("projectId is required");
    }
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? "",
      status: "todo",
      assigneeId: input.assigneeId ?? null,
      projectId: input.projectId,
    };
    this.store.set(task.id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.store.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return task;
  }

  getAll(): Task[] {
    return Array.from(this.store.values());
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      (t) => t.projectId === projectId
    );
  }

  update(id: string, input: UpdateTaskInput): Task {
    const existing = this.getById(id);
    const updated: Task = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Task not found: ${id}`);
    }
    this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task {
    const task = this.getById(id);
    const updated: Task = { ...task, assigneeId };
    this.store.set(id, updated);

    const payload: TaskAssignedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return updated;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getById(id);
    const currentIndex = STATUS_ORDER.indexOf(task.status);
    const nextIndex = STATUS_ORDER.indexOf(newStatus);

    if (nextIndex === -1) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    if (nextIndex <= currentIndex) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". Only forward transitions are allowed (todo → in-progress → done).`
      );
    }
    if (nextIndex !== currentIndex + 1) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". Statuses must be advanced one step at a time.`
      );
    }

    const oldStatus = task.status;
    const updated: Task = { ...task, status: newStatus };
    this.store.set(id, updated);

    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return updated;
  }
}
