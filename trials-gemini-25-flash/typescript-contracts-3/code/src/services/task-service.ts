import { Task, TaskStatus, ITaskService, IEventBus, TaskAssignedPayload, TaskStatusChangedPayload } from '../types';
import * as crypto from 'node:crypto';

export class TaskService implements ITaskService {
  private tasks: Map<string, Task> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
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
    if (!this.tasks.delete(id)) {
      throw new Error(`Task with ID ${id} not found`);
    }
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    if (task.assigneeId === assigneeId) {
      return task; // Already assigned to this user
    }
    const updatedTask = { ...task, assigneeId };
    this.tasks.set(taskId, updatedTask);

    // Publish event
    const payload: TaskAssignedPayload = {
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      assigneeId: updatedTask.assigneeId,
    };
    this.eventBus.publish("task.assigned", payload);

    return updatedTask;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldStatus = task.status;

    if (oldStatus === newStatus) {
      return task;
    }

    // Enforce FORWARD_ONLY_STATUS rule
    const statusOrder: TaskStatus[] = ["todo", "in-progress", "done"];
    const oldStatusIndex = statusOrder.indexOf(oldStatus);
    const newStatusIndex = statusOrder.indexOf(newStatus);

    if (newStatusIndex !== oldStatusIndex + 1) {
      throw new Error(`Invalid status transition: cannot change task from '${oldStatus}' to '${newStatus}'. Status must move forward sequentially (todo -> in-progress -> done).`);
    }

    const updatedTask = { ...task, status: newStatus };
    this.tasks.set(taskId, updatedTask);

    // Publish event
    const payload: TaskStatusChangedPayload = {
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      assigneeId: updatedTask.assigneeId,
      oldStatus: oldStatus,
      newStatus: newStatus,
    };
    this.eventBus.publish("task.statusChanged", payload);

    return updatedTask;
  }
}
