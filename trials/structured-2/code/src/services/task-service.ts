/**
 * Task Service
 * Owns the task data store exclusively.
 * Data shape: { id, title, description, status, assigneeId, projectId }
 *
 * Publishes:
 *   task.assigned       → { taskId, taskTitle, assigneeId }
 *   task.statusChanged  → { taskId, taskTitle, assigneeId, oldStatus, newStatus }
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus";

export type TaskStatus = "todo" | "in-progress" | "done";

const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export class TaskService {
  private store: Map<string, Task> = new Map();

  constructor(private eventBus: EventBus) {}

  create(data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string;
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
    this.store.set(task.id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.store.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
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

  update(
    id: string,
    data: Partial<{ title: string; description: string; projectId: string }>
  ): Task {
    const task = this.getById(id);
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.projectId !== undefined) task.projectId = data.projectId;
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

    this.eventBus.publish("task.assigned", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    });

    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getById(id);
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
    this.store.set(id, task);

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
