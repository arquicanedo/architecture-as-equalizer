import { randomUUID } from "crypto";
import { IEventBus, ITaskService, Task, TaskStatus } from "../types.js";

// Forward-only status transition map
const STATUS_ORDER: Record<TaskStatus, number> = {
  "todo": 0,
  "in-progress": 1,
  "done": 2,
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

    this.eventBus.publish("task.assigned", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: assigneeId,
    });

    return { ...task };
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.store.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const currentOrder = STATUS_ORDER[task.status];
    const newOrder = STATUS_ORDER[newStatus];

    if (newOrder !== currentOrder + 1) {
      throw new Error(
        `Invalid status transition: "${task.status}" → "${newStatus}". ` +
        `Only sequential forward transitions are allowed (todo → in-progress → done).`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(taskId, task);

    this.eventBus.publish("task.statusChanged", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus: oldStatus,
      newStatus: newStatus,
    });

    return { ...task };
  }
}
