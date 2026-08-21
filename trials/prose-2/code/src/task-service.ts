import { randomUUID } from "crypto";
import { EventBus } from "./event-bus";
import { Task, TaskStatus } from "./types";

// Valid forward-only status transitions
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["done"],
  done: [],
};

/**
 * TaskService — owns all task data.
 *
 * Publishes:
 *   • task.created       — when a task is first created
 *   • task.assigned      — when a task is (re-)assigned to a user
 *   • task.statusChanged — when a task's status changes
 */
export class TaskService {
  private tasks: Map<string, Task> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  createTask(data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string | null;
  }): Task {
    if (!data.title) throw new Error("title is required");
    if (!data.projectId) throw new Error("projectId is required");

    const task: Task = {
      id: randomUUID(),
      title: data.title,
      description: data.description ?? "",
      status: "todo",
      assigneeId: data.assigneeId ?? null,
      projectId: data.projectId,
    };

    this.tasks.set(task.id, task);

    this.eventBus.publish("task.created", {
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
    });

    // If created with an assignee, also fire task.assigned
    if (task.assigneeId) {
      this.eventBus.publish("task.assigned", {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: task.assigneeId,
        projectId: task.projectId,
      });
    }

    return task;
  }

  getTask(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task "${id}" not found`);
    return task;
  }

  getTasksByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.projectId === projectId
    );
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateTask(
    id: string,
    data: Partial<{ title: string; description: string }>
  ): Task {
    const task = this.getTask(id);

    const updated: Task = {
      ...task,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
    };

    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): void {
    if (!this.tasks.has(id)) throw new Error(`Task "${id}" not found`);
    this.tasks.delete(id);
  }

  // ── Status Transitions ────────────────────────────────────────────────────

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getTask(id);

    if (task.status === newStatus) return task; // idempotent — no event

    const allowed = TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `Allowed next statuses: ${allowed.length ? allowed.join(", ") : "none"}`
      );
    }

    const oldStatus = task.status;
    const updated: Task = { ...task, status: newStatus };
    this.tasks.set(id, updated);

    this.eventBus.publish("task.statusChanged", {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      projectId: updated.projectId,
      oldStatus,
      newStatus,
    });

    return updated;
  }

  // ── Assignment ────────────────────────────────────────────────────────────

  assignTask(id: string, assigneeId: string): Task {
    const task = this.getTask(id);

    const updated: Task = { ...task, assigneeId };
    this.tasks.set(id, updated);

    this.eventBus.publish("task.assigned", {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
      projectId: updated.projectId,
    });

    return updated;
  }

  /** Convenience: returns true if a task with this id exists. */
  exists(id: string): boolean {
    return this.tasks.has(id);
  }
}
