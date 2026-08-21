import { Task, TaskStatus, ITaskService, IEventBus, TaskAssignedPayload, TaskStatusChangedPayload } from '../types'; // Corrected import path
import * as crypto from 'node:crypto';

export class TaskService implements ITaskService {
  private tasks: Map<string, Task>;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.tasks = new Map();
    this.eventBus = eventBus;
  }

  create(input: { title: string; description: string; projectId: string }): Task {
    const id = crypto.randomUUID();
    const newTask: Task = { id, status: "todo", assigneeId: null, ...input };
    this.tasks.set(id, newTask);
    return newTask;
  }

  getById(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }
    return task;
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  update(id: string, input: Partial<{ title: string; description: string }>): Task {
    const task = this.getById(id);
    const updatedTask = { ...task, ...input };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  delete(id: string): void {
    if (!this.tasks.has(id)) {
      throw new Error(`Task with ID ${id} not found`);
    }
    this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    const oldAssigneeId = task.assigneeId;
    if (task.assigneeId !== assigneeId) {
      task.assigneeId = assigneeId;
      this.tasks.set(taskId, task);

      const payload: TaskAssignedPayload = {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: assigneeId,
      };
      this.eventBus.publish("task.assigned", payload);
    }
    return task;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldStatus = task.status;

    if (oldStatus === newStatus) {
      return task; // No change needed
    }

    // Rule 4: FORWARD_ONLY_STATUS
    const isValidTransition = (
      (oldStatus === "todo" && newStatus === "in-progress") ||
      (oldStatus === "in-progress" && newStatus === "done")
    );

    if (!isValidTransition) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    task.status = newStatus;
    this.tasks.set(taskId, task);

    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus: oldStatus,
      newStatus: newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return task;
  }
}
