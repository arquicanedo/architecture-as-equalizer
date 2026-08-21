import { Task, TaskStatus, ITaskService, IEventBus, TaskAssignedPayload, TaskStatusChangedPayload } from '../types';
import * as crypto from 'node:crypto';

export class TaskService implements ITaskService {
  private tasks = new Map<string, Task>();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    // Seed with some initial data for demo/testing
    const task1: Task = { id: crypto.randomUUID(), title: 'Implement Login', description: 'Develop user authentication flow', status: 'todo', assigneeId: null, projectId: 'project1' };
    const task2: Task = { id: crypto.randomUUID(), title: 'Design Database Schema', description: 'Create ER diagrams and define tables', status: 'in-progress', assigneeId: null, projectId: 'project1' };
    this.tasks.set(task1.id, task1);
    this.tasks.set(task2.id, task2);
  }

  create(input: { title: string; description: string; projectId: string }): Task {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: null,
      projectId: input.projectId,
    };
    this.tasks.set(newTask.id, newTask);
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
    if (input.title !== undefined) {
      task.title = input.title;
    }
    if (input.description !== undefined) {
      task.description = input.description;
    }
    this.tasks.set(id, task);
    return task;
  }

  delete(id: string): void {
    if (!this.tasks.has(id)) {
      throw new Error(`Task with ID ${id} not found`);
    }
    this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task {
    const task = this.getById(taskId);
    const oldAssigneeId = task.assigneeId; // Store old assignee for potential unassignment event

    if (task.assigneeId !== assigneeId) {
      task.assigneeId = assigneeId;
      this.tasks.set(taskId, task);

      const payload: TaskAssignedPayload = {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: assigneeId,
      };
      this.eventBus.publish('task.assigned', payload);
    }

    return task;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.getById(taskId);
    const oldStatus = task.status;

    if (oldStatus === newStatus) {
      return task; // No change
    }

    // Rule 4: FORWARD_ONLY_STATUS
    const validTransitions: { [key in TaskStatus]: TaskStatus[] } = {
      'todo': ['in-progress'],
      'in-progress': ['done'],
      'done': [], // Cannot transition from done
    };

    if (!validTransitions[oldStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from '${oldStatus}' to '${newStatus}'`);
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
    this.eventBus.publish('task.statusChanged', payload);

    return task;
  }
}
