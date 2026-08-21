// ============================================================
// Task Service — ITaskService implementation
// ============================================================

import { randomUUID } from "crypto";
import { eventBus, TaskStatus, TaskAssignedPayload, TaskStatusChangedPayload } from "../event-bus";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

interface ITaskService {
  create(input: { title: string; description: string; projectId: string }): Task;
  getById(id: string): Task;
  getByProject(projectId: string): Task[];
  update(id: string, input: Partial<{ title: string; description: string }>): Task;
  delete(id: string): void;
  assign(taskId: string, assigneeId: string): Task;
  changeStatus(taskId: string, newStatus: TaskStatus): Task;
}

// RULE 4: Forward-only state machine transitions
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  "todo": "in-progress",
  "in-progress": "done",
  "done": null,
};

class TaskService implements ITaskService {
  private store: Map<string, Task> = new Map();

  create(input: { title: string; description: string; projectId: string }): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: "todo",
      assigneeId: null,
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

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const task = this.getById(id);
    const updated: Task = {
      ...task,
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

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    const updated: Task = { ...task, assigneeId };
    this.store.set(taskId, updated);

    const payload: TaskAssignedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
    };
    eventBus.publish("task.assigned", payload);

    return updated;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const allowedNext = VALID_TRANSITIONS[task.status];

    if (allowedNext !== newStatus) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `Only "${task.status}" → "${allowedNext ?? "(terminal)"}" is allowed.`
      );
    }

    const updated: Task = { ...task, status: newStatus };
    this.store.set(taskId, updated);

    const payload: TaskStatusChangedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      oldStatus: task.status,
      newStatus,
    };
    eventBus.publish("task.statusChanged", payload);

    return updated;
  }
}

export const taskService = new TaskService();
