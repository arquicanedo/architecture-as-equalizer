// ============================================================
// Task Service Implementation
// ============================================================

import { Task, TaskStatus } from "../types.js";
import { IEventBus, TaskAssignedPayload, TaskStatusChangedPayload } from "../event-bus.js";
import { randomUUID } from "crypto";

interface ITaskService {
  create(input: { title: string; description: string; projectId: string }): Task;
  getById(id: string): Task;
  getByProject(projectId: string): Task[];
  update(id: string, input: Partial<{ title: string; description: string }>): Task;
  delete(id: string): void;
  assign(taskId: string, assigneeId: string): Task;
  changeStatus(taskId: string, newStatus: TaskStatus): Task;
}

class TaskService implements ITaskService {
  private tasks: Map<string, Task> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      status: "todo",
      assigneeId: null,
      projectId: input.projectId,
    };
    this.tasks.set(id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    return task;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const task = this.getById(id);
    if (input.title !== undefined) {
      task.title = input.title;
    }
    if (input.description !== undefined) {
      task.description = input.description;
    }
    return task;
  }

  delete(id: string): void {
    const task = this.getById(id);
    this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    task.assigneeId = assigneeId;

    const payload: TaskAssignedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return task;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldStatus = task.status;

    // RULE 4: Enforce forward-only status transitions
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      "todo": ["in-progress"],
      "in-progress": ["done"],
      "done": [],
    };

    if (!validTransitions[oldStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${oldStatus} → ${newStatus}. ` +
        `Valid transitions from ${oldStatus}: ${validTransitions[oldStatus].join(", ") || "none"}`
      );
    }

    task.status = newStatus;

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

export { ITaskService, TaskService };
