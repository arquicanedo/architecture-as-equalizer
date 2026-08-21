import { Task, TaskStatus, TaskAssignedEvent, TaskStatusChangedEvent } from './types';
import { EventBus } from './eventBus';

// Placeholder for UUID generation
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public createTask(task: Omit<Task, 'id' | 'status'> & { id?: string; status?: TaskStatus }): Task {
    const newTaskId = task.id || generateUuid();
    const newTask: Task = {
      id: newTaskId,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status || 'todo', // Default status is 'todo'
      assigneeId: task.assigneeId || null,
    };

    if (this.tasks.has(newTask.id)) {
      throw new Error(`Task with ID ${newTask.id} already exists.`);
    }
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

  public updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'status' | 'assigneeId'>>): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found.`);
    }
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  public deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  public updateTaskStatus(taskId: string, newStatus: TaskStatus): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const currentStatus = task.status;

    // Status transition validation
    if (currentStatus === 'todo' && newStatus === 'done') {
      throw new Error("Invalid status transition: 'todo' directly to 'done' is not allowed.");
    }
    if (currentStatus === 'in-progress' && newStatus === 'todo') {
      throw new Error("Invalid status transition: 'in-progress' directly to 'todo' is not allowed.");
    }
    if (currentStatus === 'done' && (newStatus === 'todo' || newStatus === 'in-progress')) {
      throw new Error("Invalid status transition: 'done' tasks cannot be moved back to 'todo' or 'in-progress'.");
    }

    if (currentStatus !== newStatus) {
      task.status = newStatus;
      this.tasks.set(taskId, task);
      this.eventBus.publish<TaskStatusChangedEvent>('task.statusChanged', {
        taskId: task.id,
        projectId: task.projectId,
        previousStatus: currentStatus,
        newStatus: newStatus,
        timestamp: Date.now(),
      });
    }
    return task;
  }

  public assignTask(taskId: string, assigneeId: string | null): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const previousAssigneeId = task.assigneeId;
    if (previousAssigneeId !== assigneeId) {
      task.assigneeId = assigneeId;
      this.tasks.set(taskId, task);
      this.eventBus.publish<TaskAssignedEvent>('task.assigned', {
        taskId: task.id,
        projectId: task.projectId,
        assigneeId: assigneeId,
        previousAssigneeId: previousAssigneeId,
        timestamp: Date.now(),
      });
    }
    return task;
  }
}
