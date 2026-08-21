import { Task, TaskId, ProjectId, UserId, TaskStatus } from './types';
import { EventBus } from './event-bus.js'; // Corrected import with .js extension
import { generateId } from './utils';

export class TaskService {
  private tasks: Map<TaskId, Task> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    // Seed some initial data
    const task1 = this.createTask({
      projectId: 'project1', // Assuming 'project1' is a valid ProjectId for demo purposes
      title: 'Design Homepage Mockups',
      description: 'Create initial mockups for the new homepage design.',
      status: 'todo',
      assigneeId: 'user1',
    });
    if (task1) {
      // These operations will publish events, which NotificationService will pick up.
      this.assignTask(task1.id, 'user2'); // Change assignee to 'user2'
      this.updateTaskStatus(task1.id, 'in-progress');
    }
  }

  public createTask(taskData: {
    projectId: ProjectId;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId?: UserId;
  }): Task {
    const newTask: Task = {
      id: generateId(),
      ...taskData,
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  public getTask(id: TaskId): Task | undefined {
    return this.tasks.get(id);
  }

  public getTasksByProject(projectId: ProjectId): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public updateTask(id: TaskId, updates: Partial<Omit<Task, 'id' | 'projectId'>>): Task | undefined {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, updates);
      return task;
    }
    return undefined;
  }

  public deleteTask(id: TaskId): boolean {
    return this.tasks.delete(id);
  }

  public updateTaskStatus(taskId: TaskId, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    const oldStatus = task.status;

    // Status transition validation
    if (oldStatus === 'todo' && newStatus === 'done') {
      throw new Error('Cannot transition directly from todo to done.');
    }
    if (oldStatus === 'in-progress' && newStatus === 'todo') {
      throw new Error('Cannot transition from in-progress to todo.');
    }
    if (oldStatus === 'done' && newStatus !== 'done') {
      throw new Error('Cannot transition out of done status.');
    }
    if (oldStatus === newStatus) {
      return task; // No change needed
    }

    task.status = newStatus;
    this.eventBus.publish({ name: 'task.statusChanged', payload: { taskId, previousStatus: oldStatus, newStatus } });
    return task;
  }

  public assignTask(taskId: TaskId, assigneeId: UserId): Task | undefined {
    const task = this.tasks.get(taskId);
    if (task) {
      const previousAssigneeId = task.assigneeId;
      if (previousAssigneeId !== assigneeId) {
        task.assigneeId = assigneeId;
        this.eventBus.publish({ name: 'task.assigned', payload: { taskId, assigneeId, previousAssigneeId } });
      }
      return task;
    }
    return undefined;
  }
}
