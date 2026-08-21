/**
 * Task Service — manages tasks with status transitions.
 * Owns the in-memory Task store.
 * Publishes: task.assigned, task.statusChanged
 * Subscribes: none
 *
 * Status transitions enforced: todo → in-progress → done (forward only)
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

// Defines which transitions are allowed (forward only)
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["done"],
  done: [],
};

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
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  create(data: {
    title: string;
    description: string;
    projectId: string;
  }): Task {
    if (!data.title) throw new Error("title is required");
    if (!data.projectId) throw new Error("projectId is required");

    const task: Task = {
      id: randomUUID(),
      title: data.title,
      description: data.description ?? "",
      status: "todo",
      assigneeId: null,
      projectId: data.projectId,
    };
    this.store.set(task.id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.store.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    return task;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      (t) => t.projectId === projectId
    );
  }

  update(
    id: string,
    data: Partial<{ title: string; description: string }>
  ): Task {
    const task = this.getById(id);
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    this.store.set(id, task);
    return task;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`Task not found: ${id}`);
    this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task {
    const task = this.getById(id);
    task.assigneeId = assigneeId;
    this.store.set(id, task);

    const payload: TaskAssignedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getById(id);
    const allowed = VALID_TRANSITIONS[task.status];

    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `Allowed transitions from "${task.status}": [${allowed.join(", ") || "none"}]`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(id, task);

    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return task;
  }
}
