/**
 * Task Service — manages tasks with status transitions.
 * Owns its own in-memory store.
 *
 * Events published:
 *   task.assigned        → { taskId, taskTitle, assigneeId }
 *   task.statusChanged   → { taskId, taskTitle, assigneeId, oldStatus, newStatus }
 *
 * Status transition rules (enforced):
 *   todo → in-progress → done   (forward, one step at a time, no skipping)
 */

import { randomUUID } from "crypto";
import { eventBus, EventBus } from "../event-bus.js";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

// ---------------------------------------------------------------------------
// Status transition rules
// Allowed transitions map — each status may only move to its immediate successor.
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  "todo": "in-progress",
  "in-progress": "done",
  "done": null, // terminal state
};

function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from] === to;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`);
    this.name = "TaskNotFoundError";
  }
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

export class TaskStatusTransitionError extends Error {
  constructor(from: TaskStatus, to: TaskStatus) {
    super(
      `Invalid status transition: "${from}" → "${to}". ` +
      `Allowed transitions: todo → in-progress → done (one step forward only).`
    );
    this.name = "TaskStatusTransitionError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TaskService {
  /** Service-owned store — no other service may access this directly. */
  private store: Map<string, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(data: {
    title: string;
    description: string;
    projectId: string;
    assigneeId?: string | null;
  }): Task {
    if (!data.title?.trim()) {
      throw new TaskValidationError("title is required");
    }
    if (!data.projectId?.trim()) {
      throw new TaskValidationError("projectId is required");
    }

    const task: Task = {
      id: randomUUID(),
      title: data.title.trim(),
      description: data.description?.trim() ?? "",
      status: "todo",
      assigneeId: data.assigneeId ?? null,
      projectId: data.projectId.trim(),
    };

    this.store.set(task.id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.store.get(id);
    if (!task) throw new TaskNotFoundError(id);
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

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new TaskValidationError("title cannot be blank");
      }
      task.title = data.title.trim();
    }
    if (data.description !== undefined) {
      task.description = data.description.trim();
    }

    this.store.set(id, task);
    return task;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new TaskNotFoundError(id);
    this.store.delete(id);
  }

  assign(id: string, assigneeId: string | null): Task {
    const task = this.getById(id);
    task.assigneeId = assigneeId;
    this.store.set(id, task);

    if (assigneeId !== null) {
      this.bus.publish("task.assigned", {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId,
      });
    }

    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const VALID_STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new TaskValidationError(
        `Invalid status "${newStatus}". Must be one of: ${VALID_STATUSES.join(", ")}`
      );
    }

    const task = this.getById(id);
    const oldStatus = task.status;

    if (oldStatus === newStatus) {
      return task; // no-op — already at that status
    }

    if (!isValidTransition(oldStatus, newStatus)) {
      throw new TaskStatusTransitionError(oldStatus, newStatus);
    }

    task.status = newStatus;
    this.store.set(id, task);

    this.bus.publish("task.statusChanged", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });

    return task;
  }
}

/** Singleton instance exported for use in the router. */
export const taskService = new TaskService(eventBus);
