/**
 * Task Service — owns all task data.
 * Publishes "task.assigned" and "task.statusChanged" events via the Event Bus.
 *
 * Status transitions are strictly sequential and forward-only:
 *   todo → in-progress → done
 * Skipping steps (todo → done) or going backwards (done → todo) are both
 * rejected with a 400 error. (ADR-001)
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";
import { ApiError } from "../errors.js";

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
  assigneeId?: string;
  status?: TaskStatus;
};

export type UpdateTaskInput = Partial<Pick<Task, "title" | "description">>;

// Maps each status to its single valid successor (null = terminal)
const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  "todo": "in-progress",
  "in-progress": "done",
  "done": null,
};

const ALL_STATUSES = new Set<string>(["todo", "in-progress", "done"]);

// Event payload shapes
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
  private readonly store = new Map<string, Task>();
  private readonly bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(input: CreateTaskInput): Task {
    if (!input.title || !input.title.trim()) {
      throw new ApiError("title is required", 400);
    }
    if (!input.projectId) {
      throw new ApiError("projectId is required", 400);
    }
    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      status: input.status ?? "todo",
      assigneeId: input.assigneeId ?? null,
      projectId: input.projectId,
    };
    this.store.set(task.id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.store.get(id);
    if (!task) throw new ApiError(`Task not found: ${id}`, 404);
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
    const task = this.getById(id);
    const updated: Task = {
      ...task,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new ApiError(`Task not found: ${id}`, 404);
    this.store.delete(id);
  }

  assign(id: string, assigneeId: string): Task {
    const task = this.getById(id);
    if (!assigneeId) throw new ApiError("assigneeId is required", 400);

    const updated: Task = { ...task, assigneeId };
    this.store.set(id, updated);

    const payload: TaskAssignedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
    };
    this.bus.publish("task.assigned", payload);

    return updated;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getById(id);

    if (!ALL_STATUSES.has(newStatus)) {
      throw new ApiError(`Invalid status value: "${newStatus}"`, 400);
    }

    const expected = NEXT_STATUS[task.status];

    if (expected === null) {
      throw new ApiError(
        `Task "${task.title}" is already in the terminal status "done". No further transitions allowed.`,
        400
      );
    }

    if (newStatus !== expected) {
      throw new ApiError(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `The only valid next status from "${task.status}" is "${expected}".`,
        400
      );
    }

    const updated: Task = { ...task, status: newStatus };
    this.store.set(id, updated);

    const payload: TaskStatusChangedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      oldStatus: task.status,
      newStatus,
    };
    this.bus.publish("task.statusChanged", payload);

    return updated;
  }
}
