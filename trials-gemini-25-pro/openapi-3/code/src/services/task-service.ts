import crypto from "crypto";
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

export type CreateTaskInput = Omit<Task, "id" | "status" | "assigneeId">;
export type UpdateTaskInput = Partial<Omit<Task, "id" | "status" | "assigneeId" | "projectId">>;

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["done"],
  done: [],
};

export class TaskService {
  private readonly tasks: Map<string, Task> = new Map();

  findByProjectId(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  create(input: CreateTaskInput): Task {
    const id = crypto.randomUUID();
    const task: Task = {
      ...input,
      id,
      status: "todo",
      assigneeId: null,
    };
    this.tasks.set(id, task);
    return task;
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }
    const updatedTask = { ...task, ...input };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);

    eventBus.publish("task.assigned", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });

    return task;
  }

  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    const allowedTransitions = STATUS_TRANSITIONS[task.status];
    if (!allowedTransitions.includes(newStatus)) {
        // This is a business logic error, not a not-found error.
        // We'll throw an error and the router will handle it.
        throw new Error(`Invalid status transition from ${task.status} to ${newStatus}`);
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.tasks.set(id, task);

    if (task.assigneeId) {
        eventBus.publish("task.statusChanged", {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            oldStatus,
            newStatus,
        });
    }

    return task;
  }
}
