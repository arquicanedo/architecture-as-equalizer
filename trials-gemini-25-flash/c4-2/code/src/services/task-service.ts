import { Task, TaskStatus, UUID, TaskAssignedEvent, TaskStatusChangedEvent } from '../types';
import { EventBus } from '../event-bus';
import * as crypto from 'crypto';

function generateUUID(): UUID {
    return crypto.randomUUID();
}

export class TaskService {
    private tasks: Map<UUID, Task> = new Map();
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public create(title: string, description: string, projectId: UUID): Task {
        if (!title || !projectId) {
            throw new Error('Task title and project ID are required.');
        }
        const newTask: Task = {
            id: generateUUID(),
            title,
            description,
            status: 'todo',
            assigneeId: null,
            projectId,
        };
        this.tasks.set(newTask.id, newTask);
        return newTask;
    }

    public getById(id: UUID): Task | undefined {
        return this.tasks.get(id);
    }

    public getByProject(projectId: UUID): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    public update(id: UUID, title?: string, description?: string): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            if (title !== undefined) task.title = title;
            if (description !== undefined) task.description = description;
            return { ...task };
        }
        return undefined;
    }

    public delete(id: UUID): boolean {
        return this.tasks.delete(id);
    }

    public assign(taskId: UUID, assigneeId: UUID | null): Task | undefined {
        const task = this.tasks.get(taskId);
        if (task) {
            task.assigneeId = assigneeId;
            this.eventBus.publish('task.assigned', { 
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId
            } as TaskAssignedEvent);
            return { ...task };
        }
        return undefined;
    }

    public changeStatus(taskId: UUID, newStatus: TaskStatus): Task | undefined {
        const task = this.tasks.get(taskId);
        if (task) {
            const oldStatus = task.status;
            let validTransition = false;
            if (oldStatus === 'todo' && newStatus === 'in-progress') {
                validTransition = true;
            } else if (oldStatus === 'in-progress' && newStatus === 'done') {
                validTransition = true;
            } else if (oldStatus === newStatus) { // Allow setting to same status
                validTransition = true;
            }

            if (!validTransition) {
                throw new Error(`Invalid task status transition from ${oldStatus} to ${newStatus}`);
            }

            task.status = newStatus;

            this.eventBus.publish('task.statusChanged', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
                oldStatus: oldStatus,
                newStatus: newStatus,
            } as TaskStatusChangedEvent);
            return { ...task };
        }
        return undefined;
    }
}
