/**
 * Task Service
 * Manages tasks with status transitions
 */

import { randomUUID } from "crypto";
import { eventBus } from "../event-bus";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  projectId: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
}

export interface AssignRequest {
  assigneeId: string;
}

export interface ChangeStatusRequest {
  status: TaskStatus;
}

export class TaskService {
  private taskStore: Map<string, Task> = new Map();

  create(req: CreateTaskRequest): Task {
    const task: Task = {
      id: randomUUID(),
      title: req.title,
      description: req.description,
      status: "todo",
      assigneeId: null,
      projectId: req.projectId,
    };
    this.taskStore.set(task.id, task);
    return task;
  }

  getById(id: string): Task | null {
    return this.taskStore.get(id) || null;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.taskStore.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  update(id: string, req: UpdateTaskRequest): Task | null {
    const task = this.taskStore.get(id);
    if (!task) return null;

    if (req.title !== undefined) {
      task.title = req.title;
    }
    if (req.description !== undefined) {
      task.description = req.description;
    }

    this.taskStore.set(id, task);
    return task;
  }

  delete(id: string): boolean {
    return this.taskStore.delete(id);
  }

  assign(id: string, req: AssignRequest): Task | null {
    const task = this.taskStore.get(id);
    if (!task) return null;

    const oldAssigneeId = task.assigneeId;
    task.assigneeId = req.assigneeId;
    this.taskStore.set(id, task);

    // Publish event
    eventBus.publish("task.assigned", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldAssigneeId,
    });

    return task;
  }

  changeStatus(id: string, req: ChangeStatusRequest): Task | null {
    const task = this.taskStore.get(id);
    if (!task) return null;

    // Enforce forward-only transitions: todo -> in-progress -> done
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      todo: ["in-progress"],
      "in-progress": ["done"],
      done: [],
    };

    if (!validTransitions[task.status].includes(req.status)) {
      throw new Error(
        `Invalid status transition from ${task.status} to ${req.status}`
      );
    }

    const oldStatus = task.status;
    task.status = req.status;
    this.taskStore.set(id, task);

    // Publish event
    eventBus.publish("task.statusChanged", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus: task.status,
    });

    return task;
  }
}

export const taskService = new TaskService();
