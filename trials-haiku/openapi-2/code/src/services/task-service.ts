/**
 * Task Service
 * Manages task data. Publishes events to the event bus for status changes and assignments.
 * No other service may access this store.
 */

import { eventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

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
  private nextId = 1;

  /**
   * Create a new task
   */
  create(title: string, description: string, projectId: string): Task {
    const id = `task-${this.nextId++}`;
    const task: Task = {
      id,
      title,
      description,
      status: 'todo',
      assigneeId: null,
      projectId,
    };
    this.store.set(id, task);
    return task;
  }

  /**
   * Get task by ID
   */
  getById(id: string): Task | undefined {
    return this.store.get(id);
  }

  /**
   * Get all tasks for a project
   */
  listByProject(projectId: string): Task[] {
    return Array.from(this.store.values()).filter(
      task => task.projectId === projectId
    );
  }

  /**
   * Get all tasks
   */
  listAll(): Task[] {
    return Array.from(this.store.values());
  }

  /**
   * Update task (title and description only)
   */
  update(
    id: string,
    updates: Partial<Pick<Task, 'title' | 'description'>>
  ): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...updates,
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete task
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Change task status (forward-only transitions)
   * Transitions: todo -> in-progress -> done
   */
  changeStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      'todo': ['in-progress'],
      'in-progress': ['done'],
      'done': [],
    };

    if (!validTransitions[task.status].includes(newStatus)) {
      return undefined; // Invalid transition
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.store.set(id, task);

    // Publish event for status change
    eventBus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });

    return task;
  }

  /**
   * Assign task to user
   */
  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.store.get(id);
    if (!task) return undefined;

    task.assigneeId = assigneeId;
    this.store.set(id, task);

    // Publish event for task assignment
    eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    });

    return task;
  }
}

export const taskService = new TaskService();
