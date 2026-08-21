import * as crypto from 'crypto';
import { eventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export type CreateTaskInput = Omit<Task, 'id' | 'status' | 'assigneeId'>;
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'status' | 'assigneeId' | 'projectId'>
>;

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in-progress'],
  'in-progress': ['done'],
  done: [],
};

export class TaskService {
  private readonly tasks: Map<string, Task> = new Map();

  public createTask(input: CreateTaskInput): Task {
    const id = crypto.randomUUID();
    const task: Task = {
      id,
      ...input,
      status: 'todo',
      assigneeId: null,
    };
    this.tasks.set(id, task);
    return task;
  }

  public getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public listTasksByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  public updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }
    const updatedTask = { ...task, ...input };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  public deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  public changeTaskStatus(
    id: string,
    newStatus: TaskStatus
  ): Task | 'NOT_FOUND' | 'INVALID_TRANSITION' {
    const task = this.tasks.get(id);
    if (!task) {
      return 'NOT_FOUND';
    }

    const allowedTransitions = STATUS_TRANSITIONS[task.status];
    if (!allowedTransitions.includes(newStatus)) {
      return 'INVALID_TRANSITION';
    }

    const oldStatus = task.status;
    task.status = newStatus;
    this.tasks.set(id, task);

    if (task.assigneeId) {
        eventBus.publish('task.statusChanged', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            oldStatus,
            newStatus,
        });
    }

    return task;
  }

  public assignTask(id: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    task.assigneeId = assigneeId;
    this.tasks.set(id, task);

    eventBus.publish('task.assigned', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
    });

    return task;
  }
}
