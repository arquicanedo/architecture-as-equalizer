import { randomUUID } from "crypto";
import {
  Task,
  ITaskService,
  TaskStatus,
  IEventBus,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from "../types";

export class TaskService implements ITaskService {
  private tasks = new Map<string, Task>();

  constructor(private eventBus: IEventBus) {}

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      ...input,
      status: "todo",
      assigneeId: null,
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
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const task = this.getById(id);
    const updatedTask = { ...task, ...input };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  delete(id: string): void {
    if (!this.tasks.has(id)) {
      throw new Error(`Task with id ${id} not found`);
    }
    this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    task.assigneeId = assigneeId;
    this.tasks.set(taskId, task);

    const payload: TaskAssignedPayload = {
      taskId,
      taskTitle: task.title,
      assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return task;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldStatus = task.status;

    if (oldStatus === newStatus) {
      return task;
    }

    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      todo: ["in-progress"],
      "in-progress": ["done"],
      done: [],
    };

    if (!allowedTransitions[oldStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${oldStatus} to ${newStatus}`
      );
    }

    task.status = newStatus;
    this.tasks.set(taskId, task);

    const payload: TaskStatusChangedPayload = {
      taskId,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return task;
  }
}
