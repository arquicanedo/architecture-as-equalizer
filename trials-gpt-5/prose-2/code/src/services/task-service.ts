import { EventBus, TaskStatus, TaskAssignedEvent, TaskStatusChangedEvent, TaskCreatedEvent, TaskDeletedEvent, CommentAddedEvent, CommentAddedEnrichedEvent } from '../event-bus';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string; // user ID
  projectId: string;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;

    // Listen for comments to enrich with assignee info
    this.bus.subscribe<CommentAddedEvent>('comment.added', (e) => {
      const task = this.tasks.get(e.taskId);
      const enriched: CommentAddedEnrichedEvent = {
        ...e,
        taskAssigneeId: task?.assigneeId,
      };
      this.bus.publish('comment.added.enriched', enriched);
    });
  }

  list(filter?: { projectId?: string }): Task[] {
    let arr = Array.from(this.tasks.values());
    if (filter?.projectId) arr = arr.filter((t) => t.projectId === filter.projectId);
    return arr;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  create(input: { title: string; description?: string; assigneeId?: string; projectId: string }): Task {
    const id = this.generateId();
    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: input.assigneeId,
      projectId: input.projectId,
    };
    this.tasks.set(id, task);
    const event: TaskCreatedEvent = { taskId: id, projectId: task.projectId, assigneeId: task.assigneeId, title: task.title };
    this.bus.publish('task.created', event);
    if (task.assigneeId) {
      const assignedEvent: TaskAssignedEvent = { taskId: id, assigneeId: task.assigneeId, projectId: task.projectId, title: task.title };
      this.bus.publish('task.assigned', assignedEvent);
    }
    return task;
  }

  update(id: string, input: Partial<Omit<Task, 'id' | 'status' | 'projectId'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input, id };
    this.tasks.set(id, updated);
    if (existing.assigneeId !== updated.assigneeId && updated.assigneeId) {
      const assignedEvent: TaskAssignedEvent = { taskId: id, assigneeId: updated.assigneeId, projectId: updated.projectId, title: updated.title };
      this.bus.publish('task.assigned', assignedEvent);
    }
    return updated;
  }

  delete(id: string): boolean {
    const existing = this.tasks.get(id);
    if (!existing) return false;
    this.tasks.delete(id);
    const event: TaskDeletedEvent = { taskId: id, assigneeId: existing.assigneeId, projectId: existing.projectId, title: existing.title };
    this.bus.publish('task.deleted', event);
    return true;
  }

  setStatus(id: string, to: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const from = task.status;
    if (!this.isValidTransition(from, to)) return undefined;
    task.status = to;
    const event: TaskStatusChangedEvent = { taskId: id, from, to, assigneeId: task.assigneeId, projectId: task.projectId, title: task.title };
    this.bus.publish('task.statusChanged', event);
    return task;
  }

  assign(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    task.assigneeId = assigneeId;
    const event: TaskAssignedEvent = { taskId: id, assigneeId, projectId: task.projectId, title: task.title };
    this.bus.publish('task.assigned', event);
    return task;
  }

  private isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
    const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    return toIdx === fromIdx || toIdx === fromIdx + 1; // allow idempotent set and forward one step
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
