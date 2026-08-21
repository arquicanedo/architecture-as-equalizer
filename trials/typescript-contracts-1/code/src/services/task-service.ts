import { randomUUID } from "crypto";
import {
  Task,
  TaskStatus,
  ITaskService,
  IEventBus,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from "../types";

// RULE 4: FORWARD_ONLY_STATUS — valid transitions
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  todo: "in-progress",
  "in-progress": "done",
  done: null,
};

export class TaskService implements ITaskService {
  private store: Map<string, Task> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

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
    return { ...task };
  }

  getById(id: string): Task {
    const task = this.store.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return { ...task };
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values())
      .filter((t) => t.projectId === projectId)
      .map((t) => ({ ...t }));
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const task = this.store.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    if (input.title !== undefined) task.title = input.title;
    if (input.description !== undefined) task.description = input.description;
    this.store.set(id, task);
    return { ...task };
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Task not found: ${id}`);
    }
    this.store.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.store.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    task.assigneeId = assigneeId;
    this.store.set(taskId, task);

    const payload: TaskAssignedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return { ...task };
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.store.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const allowedNext = VALID_TRANSITIONS[task.status];
    if (allowedNext !== newStatus) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
          `Only allowed transition from "${task.status}" is → "${allowedNext ?? "(none, already done)"}".`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(taskId, task);

    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return { ...task };
  }
}
