// Task Service - Manages tasks
import { randomUUID } from "crypto";
import { eventBus } from "../event-bus";

type TaskStatus = "todo" | "in-progress" | "done";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

class TaskService {
  private store: Map<string, Task> = new Map();

  /**
   * Create a new task
   */
  create(
    title: string,
    description: string,
    projectId: string,
    assigneeId?: string
  ): Task {
    const task: Task = {
      id: randomUUID(),
      title,
      description,
      status: "todo",
      assigneeId: assigneeId || null,
      projectId,
    };
    this.store.set(task.id, task);
    return task;
  }

  /**
   * Get task by ID
   */
  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return Array.from(this.store.values());
  }

  /**
   * Get tasks by project
   */
  getByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  /**
   * Update a task
   */
  update(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const updated = { ...task, ...updates, id };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a task
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Assign a task to a user
   */
  assign(taskId: string, assigneeId: string): Task | undefined {
    const task = this.store.get(taskId);
    if (!task) return undefined;

    task.assigneeId = assigneeId;
    this.store.set(taskId, task);

    // Publish event
    eventBus.publish("task.assigned", {
      taskId,
      taskTitle: task.title,
      assigneeId,
    });

    return task;
  }

  /**
   * Change task status (forward only: todo → in-progress → done)
   */
  changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined {
    const task = this.store.get(taskId);
    if (!task) return undefined;

    const statusOrder = ["todo", "in-progress", "done"];
    const currentIndex = statusOrder.indexOf(task.status);
    const newIndex = statusOrder.indexOf(newStatus);

    // Only allow forward transitions
    if (newIndex <= currentIndex) {
      throw new Error(
        `Cannot transition from ${task.status} to ${newStatus}. Only forward transitions are allowed.`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(taskId, task);

    // Publish event
    eventBus.publish("task.statusChanged", {
      taskId,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });

    return task;
  }
}

export const taskService = new TaskService();
