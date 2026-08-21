import { randomUUID } from "crypto";
import {
  eventBus,
  EVENT_TASK_ASSIGNED,
  EVENT_TASK_STATUS_CHANGED,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from "../event-bus.js";

// ── Domain types ────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
}

// Forward-only status transition table
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  todo: "in-progress",
  "in-progress": "done",
  done: null, // terminal state
};

// ── Service ─────────────────────────────────────────────────────────────────

export class TaskService {
  /** Owned data store — no other service may access this. */
  private store: Map<string, Task> = new Map();

  listByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      (t) => t.projectId === projectId
    );
  }

  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  create(input: CreateTaskInput): Task {
    if (!input.title || input.title.trim() === "") {
      throw new Error("Task title is required.");
    }
    if (!input.projectId) {
      throw new Error("Task projectId is required.");
    }

    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description ?? "",
      status: "todo",
      assigneeId: null,
      projectId: input.projectId,
    };

    this.store.set(task.id, task);
    return task;
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: Task = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    };

    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Advance task status following the forward-only rule: todo → in-progress → done.
   * Throws if the transition is invalid.
   */
  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.store.get(id);
    if (!task) throw new Error(`Task ${id} not found.`);

    const allowedNext = VALID_TRANSITIONS[task.status];

    if (allowedNext === null) {
      throw new Error(
        `Task is already in terminal status "${task.status}". No further transitions are allowed.`
      );
    }

    if (newStatus !== allowedNext) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `Only "${allowedNext}" is allowed next.`
      );
    }

    const oldStatus = task.status;
    const updated: Task = { ...task, status: newStatus };
    this.store.set(id, updated);

    // Publish event — NotificationService subscribes
    const payload: TaskStatusChangedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      oldStatus,
      newStatus,
    };
    eventBus.publish(EVENT_TASK_STATUS_CHANGED, payload);

    return updated;
  }

  /**
   * Assign a task to a user. Publishes task.assigned event.
   */
  assignTask(id: string, assigneeId: string): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const updated: Task = { ...task, assigneeId };
    this.store.set(id, updated);

    const payload: TaskAssignedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
    };
    eventBus.publish(EVENT_TASK_ASSIGNED, payload);

    return updated;
  }
}
