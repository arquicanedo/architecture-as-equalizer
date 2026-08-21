import {
  ITaskService,
  Task,
  TaskStatus,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  IEventBus,
  ITaskLookup,
} from "../types";
import { randomUUID } from "crypto";

export class TaskService implements ITaskService, ITaskLookup {
  // RULE 2: exclusive data ownership
  private tasks: Map<string, Task> = new Map();

  constructor(private eventBus: IEventBus) {}

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
    const t = this.tasks.get(id);
    if (!t) throw new Error("Task not found");
    return t;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const t = this.getById(id);
    const updated: Task = { ...t, ...input };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.tasks.delete(id)) {
      throw new Error("Task not found");
    }
  }

  assign(taskId: string, assigneeId: string): Task {
    const t = this.getById(taskId);
    const updated: Task = { ...t, assigneeId };
    this.tasks.set(taskId, updated);

    const payload: TaskAssignedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);
    return updated;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const t = this.getById(taskId);
    // RULE 4: FORWARD_ONLY_STATUS
    const forward: Record<TaskStatus, TaskStatus | null> = {
      "todo": "in-progress",
      "in-progress": "done",
      "done": null,
    };
    const expectedNext = forward[t.status];
    if (expectedNext !== newStatus) {
      throw new Error("Invalid status transition: must progress todo → in-progress → done");
    }
    const updated: Task = { ...t, status: newStatus };
    this.tasks.set(taskId, updated);

    const payload: TaskStatusChangedPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeId: updated.assigneeId,
      oldStatus: t.status,
      newStatus: updated.status,
    };
    this.eventBus.publish("task.statusChanged", payload);
    return updated;
  }

  // ITaskLookup
  getTaskTitle(taskId: string): string {
    const t = this.tasks.get(taskId);
    if (!t) throw new Error("Task not found");
    return t.title;
  }
}
