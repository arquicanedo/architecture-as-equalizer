import { randomUUID } from 'crypto';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from './types';
import { EventBus } from './event-bus';

// Ordered list of valid statuses — a task may only move forward.
const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];

function statusIndex(s: TaskStatus): number {
  return STATUS_ORDER.indexOf(s);
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  /** Create a new task within a project. */
  createTask(dto: CreateTaskDTO): Task {
    if (!dto.title || dto.title.trim() === '') {
      throw new Error('Task title is required.');
    }
    if (!dto.projectId) {
      throw new Error('Task projectId is required.');
    }

    const task: Task = {
      id: randomUUID(),
      title: dto.title.trim(),
      description: (dto.description ?? '').trim(),
      status: 'todo',
      assigneeId: null,
      projectId: dto.projectId,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /** Return all tasks, optionally filtered by projectId. */
  listTasks(projectId?: string): Task[] {
    const all = Array.from(this.tasks.values());
    return projectId ? all.filter((t) => t.projectId === projectId) : all;
  }

  /** Return a single task by ID, or undefined if not found. */
  getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /** Update task title / description. Throws if not found. */
  updateTask(id: string, dto: UpdateTaskDTO): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task "${id}" not found.`);

    if (dto.title !== undefined) {
      if (dto.title.trim() === '') throw new Error('Task title cannot be empty.');
      task.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      task.description = dto.description.trim();
    }

    return task;
  }

  /** Delete a task by ID. Throws if not found. */
  deleteTask(id: string): void {
    if (!this.tasks.has(id)) throw new Error(`Task "${id}" not found.`);
    this.tasks.delete(id);
  }

  /**
   * Transition a task's status.
   * Valid transitions: todo → in-progress → done
   * Backwards transitions are rejected.
   */
  changeStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task "${id}" not found.`);

    if (!STATUS_ORDER.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}".`);
    }

    if (statusIndex(newStatus) <= statusIndex(task.status)) {
      throw new Error(
        `Invalid status transition from "${task.status}" to "${newStatus}". ` +
          `Status may only move forward: todo → in-progress → done.`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;

    this.eventBus.publish('task.status_changed', {
      taskId: task.id,
      taskTitle: task.title,
      oldStatus,
      newStatus,
      assigneeId: task.assigneeId,
      projectId: task.projectId,
    });

    return task;
  }

  /**
   * Assign a task to a user.
   * Passing null unassigns the task.
   */
  assignTask(id: string, assigneeId: string | null): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task "${id}" not found.`);

    task.assigneeId = assigneeId;

    if (assigneeId !== null) {
      this.eventBus.publish('task.assigned', {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId,
        projectId: task.projectId,
      });
    }

    return task;
  }
}
