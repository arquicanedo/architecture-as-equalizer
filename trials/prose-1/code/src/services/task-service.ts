/**
 * TaskService — owns all task data.
 *
 * Enforces valid status transitions:
 *   todo → in-progress → done
 *
 * Publishes events to the EventBus so that other services
 * (e.g. NotificationService) can react without being coupled
 * to the TaskService directly.
 */

import { randomUUID } from "crypto";
import type { EventBus } from "../event-bus.js";
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from "../types.js";

/** Ordered status chain — earlier index = earlier in lifecycle. */
const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];

function statusRank(s: TaskStatus): number {
  return STATUS_ORDER.indexOf(s);
}

export class TaskService {
  private readonly tasks: Map<string, Task> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * Create a new task in the given project.
   * The router is responsible for verifying the project exists.
   */
  createTask(input: CreateTaskInput): Task {
    if (!input.title || input.title.trim() === "") {
      throw new Error("Task title is required.");
    }
    if (!input.projectId) {
      throw new Error("Task projectId is required.");
    }

    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      status: "todo",
      assigneeId: null,
      projectId: input.projectId,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getTask(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task "${id}" not found.`);
    return task;
  }

  /**
   * List all tasks, optionally filtering by projectId.
   */
  listTasks(projectId?: string): Task[] {
    const all = [...this.tasks.values()];
    return projectId ? all.filter((t) => t.projectId === projectId) : all;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  updateTask(id: string, input: UpdateTaskInput): Task {
    const task = this.getTask(id);

    if (input.title !== undefined) {
      if (input.title.trim() === "") throw new Error("Task title cannot be empty.");
      task.title = input.title.trim();
    }
    if (input.description !== undefined) {
      task.description = input.description.trim();
    }

    return task;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteTask(id: string): void {
    if (!this.tasks.has(id)) throw new Error(`Task "${id}" not found.`);
    this.tasks.delete(id);
  }

  // ── Status transitions ────────────────────────────────────────────────────

  /**
   * Advance (or validate) a status transition.
   * Only forward transitions are allowed; attempting to move
   * backwards (e.g. done → todo) throws an error.
   */
  setStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getTask(id);
    const currentRank = statusRank(task.status);
    const newRank = statusRank(newStatus);

    if (newRank === -1) {
      throw new Error(
        `Invalid status "${newStatus}". Valid values: ${STATUS_ORDER.join(", ")}.`
      );
    }

    if (newRank === currentRank) {
      // No-op — already in that state
      return task;
    }

    if (newRank < currentRank) {
      throw new Error(
        `Invalid status transition: cannot move from "${task.status}" to "${newStatus}".`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;

    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      projectId: task.projectId,
      oldStatus,
      newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return task;
  }

  // ── Assignment ────────────────────────────────────────────────────────────

  /**
   * Assign (or re-assign) a task to a user.
   * The router is responsible for confirming the user exists.
   */
  assignTask(id: string, userId: string): Task {
    const task = this.getTask(id);
    task.assigneeId = userId;

    const payload: TaskAssignedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: userId,
      projectId: task.projectId,
    };
    this.eventBus.publish("task.assigned", payload);

    return task;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  taskExists(id: string): boolean {
    return this.tasks.has(id);
  }

  /** Delete all tasks belonging to a project (called when a project is deleted). */
  deleteTasksByProject(projectId: string): void {
    for (const [id, task] of this.tasks) {
      if (task.projectId === projectId) this.tasks.delete(id);
    }
  }
}
