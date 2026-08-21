/**
 * Task Service — manages tasks with status transitions.
 * Owns its own in-memory data store (Map<string, Task>).
 *
 * Status transitions are forward-only: todo → in-progress → done
 *
 * Events published:
 *   task.assigned       { taskId, taskTitle, assigneeId }
 *   task.statusChanged  { taskId, taskTitle, assigneeId, oldStatus, newStatus }
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

// Ordered list used to enforce forward-only transitions
const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];

export class TaskService {
  private store: Map<string, Task> = new Map();

  constructor(private eventBus: EventBus) {}

  create(
    title: string,
    description: string,
    projectId: string
  ): Task {
    if (!title || !projectId) throw new Error("title and projectId are required");
    const task: Task = {
      id: randomUUID(),
      title,
      description: description ?? "",
      status: "todo",
      assigneeId: null,
      projectId,
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
    fields: Partial<Pick<Task, "title" | "description">>
  ): Task {
    const task = this.getById(id);
    if (fields.title !== undefined) task.title = fields.title;
    if (fields.description !== undefined) task.description = fields.description;
    this.store.set(id, task);
    return task;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`Task not found: ${id}`);
    this.store.delete(id);
  }

  assign(taskId: string, assigneeId: string | null): Task {
    const task = this.getById(taskId);
    task.assigneeId = assigneeId;
    this.store.set(taskId, task);

    if (assigneeId !== null) {
      this.eventBus.publish("task.assigned", {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId,
      });
    }

    return task;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldIndex = STATUS_ORDER.indexOf(task.status);
    const newIndex = STATUS_ORDER.indexOf(newStatus);

    if (newIndex === -1) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    if (newIndex <= oldIndex) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". Only forward transitions are allowed (todo → in-progress → done).`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(taskId, task);

    this.eventBus.publish("task.statusChanged", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });

    return task;
  }
}
