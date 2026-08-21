import { Task, TaskStatus, ITaskService } from "../types";
import { IEventBus, TaskAssignedPayload, TaskStatusChangedPayload } from "../event-bus";
import { randomBytes } from "crypto";

export class TaskService implements ITaskService {
  private tasks: Map<string, Task> = new Map();

  constructor(private eventBus: IEventBus) {}

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  create(input: {
    title: string;
    description: string;
    projectId: string;
  }): Task {
    const task: Task = {
      id: this.generateId(),
      title: input.title,
      description: input.description,
      status: "todo",
      assigneeId: null,
      projectId: input.projectId,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getById(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
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

    // Publish task.assigned event
    const payload: TaskAssignedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return task;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldStatus = task.status;

    // RULE 4: Forward-only status transitions
    // todo → in-progress → done
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      todo: ["in-progress"],
      "in-progress": ["done"],
      done: [],
    };

    if (!validTransitions[oldStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${oldStatus} → ${newStatus}. ` +
          `Valid transitions are: ${validTransitions[oldStatus].join(", ") || "none"}`
      );
    }

    task.status = newStatus;

    // Publish task.statusChanged event
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
