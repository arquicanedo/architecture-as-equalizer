import { randomUUID } from 'crypto';
import { 
    Task, 
    ITaskService, 
    TaskStatus, 
    IEventBus, 
    TaskAssignedPayload, 
    TaskStatusChangedPayload 
} from '../types';

export class TaskService implements ITaskService {
    private tasks: Map<string, Task> = new Map();

    constructor(private eventBus: IEventBus) {}

    create(input: { title: string; description: string; projectId: string }): Task {
        const newTask: Task = {
            id: randomUUID(),
            title: input.title,
            description: input.description,
            projectId: input.projectId,
            status: 'todo',
            assigneeId: null,
        };
        this.tasks.set(newTask.id, newTask);
        return newTask;
    }

    getById(id: string): Task {
        const task = this.tasks.get(id);
        if (!task) {
            throw new Error('Task not found');
        }
        return task;
    }

    getByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
    }

    update(id: string, input: Partial<{ title: string; description: string }>): Task {
        const task = this.getById(id);
        if (input.title) {
            task.title = input.title;
        }
        if (input.description) {
            task.description = input.description;
        }
        this.tasks.set(id, task);
        return task;
    }

    delete(id: string): void {
        if (!this.tasks.delete(id)) {
            throw new Error('Task not found');
        }
    }

    assign(taskId: string, assigneeId: string): Task {
        const task = this.getById(taskId);
        task.assigneeId = assigneeId;
        this.tasks.set(taskId, task);

        const payload: TaskAssignedPayload = {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: assigneeId,
        };
        this.eventBus.publish('task.assigned', payload);

        return task;
    }

    changeStatus(taskId: string, newStatus: TaskStatus): Task {
        const task = this.getById(taskId);
        const oldStatus = task.status;

        const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
            'todo': ['in-progress'],
            'in-progress': ['done'],
            'done': [],
        };

        if (!allowedTransitions[oldStatus].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
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
