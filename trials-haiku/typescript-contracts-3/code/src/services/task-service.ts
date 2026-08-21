// ============================================================
// Task Service
// ============================================================

import { IEventBus } from "../event-bus.js";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export interface ITaskService {
  create(input: { title: string; description: string; projectId: string }): Task;
  getById(id: string): Task;
  getByProject(projectId: string): Task[];
  update(id: string, input: Partial<{ title: string; description: string }>): Task;
  delete(id: string): void;
  assign(taskId: string, assigneeId: string): Task;
  changeStatus(taskId: string, newStatus: TaskStatus): Task;
}

export class TaskService implements ITaskService {
  private tasks: Map<string, Task> = new Map();
  private nextId = 1;

  constructor(private eventBus: IEventBus) {}

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = `task-${this.nextId++}`;
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
      throw new Error(`Task not found: ${id}`);
    }
    return task;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const task = this.getById(id);
    if (input.title !== undefined) {
      task.title = input.title;
    }
    if (input.description !== undefined) {
      task.description = input.description;
    }
    this.tasks.set(id, task);
    return task;
  }

  delete(id: string): void {
    if (!this.tasks.has(id)) {
      throw new Error(`Task not found: ${id}`);
    }
    this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    task.assigneeId = assigneeId;
    this.tasks.set(taskId, task);

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

    // RULE 4: Enforce strict forward-only state machine
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      todo: ["in-progress"],
      "in-progress": ["done"],
      done: [],
    };

    const allowedNextStates = validTransitions[oldStatus];
    if (!allowedNextStates.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${oldStatus} → ${newStatus}. Only these transitions are allowed: ${oldStatus} → ${allowedNextStates.join(", ")}`
      );
    }

    task.status = newStatus;
    this.tasks.set(taskId, task);

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
