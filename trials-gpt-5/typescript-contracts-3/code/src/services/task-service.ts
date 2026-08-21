import { IEventBus, ITaskService, Task, TaskAssignedPayload, TaskStatus, TaskStatusChangedPayload } from "../types";
import { randomUUID } from "crypto";

export class TaskService implements ITaskService {
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
    if (!t) throw new Error(`Task not found: ${id}`);
    return t;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const t = this.getById(id);
    const updated: Task = { ...t, ...input } as Task;
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.tasks.delete(id)) {
      throw new Error(`Task not found: ${id}`);
    }
  }

  assign(taskId: string, assigneeId: string): Task {
    const t = this.getById(taskId);
    t.assigneeId = assigneeId;
    this.tasks.set(taskId, t);
    const payload: TaskAssignedPayload = { taskId: t.id, taskTitle: t.title, assigneeId };
    this.eventBus.publish("task.assigned", payload);
    return t;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const t = this.getById(taskId);
    const oldStatus = t.status;

    // Enforce forward-only state transitions
    if (oldStatus === newStatus) return t;

    const order: TaskStatus[] = ["todo", "in-progress", "done"];
    const oldIndex = order.indexOf(oldStatus);
    const newIndex = order.indexOf(newStatus);

    if (newIndex === -1) throw new Error(`Invalid status: ${newStatus}`);

    if (newIndex !== oldIndex + 1) {
      // Prevent backwards or skipping transitions
      throw new Error(`Invalid status transition: ${oldStatus} -> ${newStatus}`);
    }

    t.status = newStatus;
    this.tasks.set(taskId, t);

    const payload: TaskStatusChangedPayload = {
      taskId: t.id,
      taskTitle: t.title,
      assigneeId: t.assigneeId,
      oldStatus,
      newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return t;
  }
}

export default TaskService;
