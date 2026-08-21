/**
 * Task Service - Manages tasks and their status/assignments
 * Data ownership: Task records (id, title, description, status, assigneeId, projectId)
 * Events published:
 *   - task.assigned: {taskId, taskTitle, assigneeId}
 *   - task.statusChanged: {taskId, taskTitle, assigneeId, oldStatus, newStatus}
 */

import { EventBus } from "../event-bus.js";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  assigneeId: string | null;
  projectId: string;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private nextId = 1;

  constructor(private eventBus: EventBus) {}

  /**
   * Create a new task
   */
  create(
    title: string,
    description: string,
    projectId: string
  ): Task {
    const id = `task_${this.nextId++}`;
    const task: Task = {
      id,
      title,
      description,
      status: "todo",
      assigneeId: null,
      projectId,
    };
    this.tasks.set(id, task);
    return task;
  }

  /**
   * Get task by ID
   */
  getById(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by project ID
   */
  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  /**
   * Update task (basic fields only)
   */
  update(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated = {
      ...task,
      title: updates.title ?? task.title,
      description: updates.description ?? task.description,
    };
    this.tasks.set(id, updated);
    return updated;
  }

  /**
   * Delete task
   */
  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * Assign task to a user
   */
  assign(taskId: string, assigneeId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.assigneeId = assigneeId;
    this.tasks.set(taskId, task);

    // Publish event
    this.eventBus.publish("task.assigned", {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    });

    return task;
  }

  /**
   * Change task status (forward-only: todo → in-progress → done)
   */
  changeStatus(
    taskId: string,
    newStatus: "todo" | "in-progress" | "done"
  ): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // Validate forward-only transitions
    const statusOrder = { todo: 0, "in-progress": 1, done: 2 };
    const currentOrder = statusOrder[task.status];
    const newOrder = statusOrder[newStatus];

    if (newOrder < currentOrder) {
      throw new Error(
        `Invalid status transition: ${task.status} -> ${newStatus}`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.tasks.set(taskId, task);

    // Publish event
    if (task.assigneeId) {
      this.eventBus.publish("task.statusChanged", {
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
