import { Task, TaskStatus, TaskAssignedEvent, TaskStatusChangedEvent } from '../types';
import { EventBus } from '../event-bus';
import { randomUUID } from 'crypto';

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public createTask(projectId: string, title: string, description: string, assigneeId: string | null = null): Task {
    const newTask: Task = {
      id: randomUUID(),
      projectId,
      title,
      description,
      status: 'todo',
      assigneeId,
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  public getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public getTasksByProjectId(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public updateTask(id: string, title?: string, description?: string): Task | undefined {
    const task = this.tasks.get(id);
    if (task) {
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      return task;
    }
    return undefined;
  }

  public updateTaskStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const oldStatus = task.status;

    // Validate status transitions
    if (oldStatus === 'todo' && newStatus === 'done') return undefined; // Cannot skip in-progress
    if (oldStatus === 'in-progress' && newStatus === 'todo') return undefined; // Cannot go backward
    if (oldStatus === 'done' && newStatus !== 'done') return undefined; // Cannot change from done
    if (oldStatus === newStatus) return task; // No change

    task.status = newStatus;

    // Publish event
    this.eventBus.publish<TaskStatusChangedEvent>('task.statusChanged', {
      taskId: task.id,
      projectId: task.projectId,
      newStatus,
      oldStatus,
    });

    return task;
  }

  public assignTask(taskId: string, assigneeId: string | null): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const previousAssigneeId = task.assigneeId;
    if (previousAssigneeId === assigneeId) return task; // No change

    task.assigneeId = assigneeId;

    // Publish event
    this.eventBus.publish<TaskAssignedEvent>('task.assigned', {
      taskId: task.id,
      projectId: task.projectId,
      assigneeId,
      previousAssigneeId,
    });

    return task;
  }

  public deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }
}
