import { eventBus } from '../event-bus';

type TaskStatus = 'todo' | 'in-progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
  projectId: string;
}

class TaskService {
  private tasks: Map<string, Task> = new Map();
  private nextId: number = 1;

  create(title: string, description: string, projectId: string): Task {
    const id = `task-${this.nextId++}`;
    const newTask: Task = { id, title, description, status: 'todo', projectId };
    this.tasks.set(id, newTask);
    return newTask;
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getByProject(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  update(id: string, title: string, description: string): Task | undefined {
    const task = this.tasks.get(id);
    if (task) {
      task.title = title;
      task.description = description;
      return task;
    }
    return undefined;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  assign(taskId: string, assigneeId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (task) {
      task.assigneeId = assigneeId;
      eventBus.publish('task.assigned', { taskId: task.id, taskTitle: task.title, assigneeId });
      return task;
    }
    return undefined;
  }

  changeStatus(taskId: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(taskId);
    if (task) {
      const oldStatus = task.status;
      // Enforce forward-only status transitions
      if (
        (oldStatus === 'todo' && newStatus === 'in-progress') ||
        (oldStatus === 'in-progress' && newStatus === 'done') ||
        (oldStatus === newStatus)
      ) {
        task.status = newStatus;
        if (oldStatus !== newStatus && task.assigneeId) {
          eventBus.publish('task.statusChanged', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            oldStatus,
            newStatus,
          });
        }
        return task;
      } else {
        console.warn(`Invalid status transition for task ${taskId}: ${oldStatus} -> ${newStatus}`);
      }
    }
    return undefined;
  }
}

export const taskService = new TaskService();
