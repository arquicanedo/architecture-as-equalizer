import { randomUUID } from 'crypto';
import { CreateTaskInput, Task, TaskStatus, UpdateTaskInput, UUID } from '../types';
import { EventBus } from '../event-bus';

export class TaskService {
  private tasks: Map<UUID, Task> = new Map();

  constructor(private eventBus: EventBus) {}

  listByProject(projectId: UUID): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }

  create(input: CreateTaskInput): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: null,
      projectId: input.projectId,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  get(id: UUID): Task | undefined {
    return this.tasks.get(id);
  }

  update(id: UUID, input: UpdateTaskInput): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: UUID): boolean {
    return this.tasks.delete(id);
  }

  changeStatus(id: UUID, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const allowed: Record<TaskStatus, TaskStatus[]> = {
      'todo': ['in-progress'],
      'in-progress': ['done'],
      'done': [],
    };
    if (!allowed[task.status].includes(newStatus)) {
      throw new Error('Invalid status transition');
    }
    const oldStatus = task.status;
    task.status = newStatus;
    this.tasks.set(id, task);
    this.eventBus.publish('task.statusChanged', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus,
    });
    return task;
  }

  assign(id: UUID, assigneeId: UUID): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    this.tasks.set(id, task);
    this.eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId,
    });
    return task;
  }
}
