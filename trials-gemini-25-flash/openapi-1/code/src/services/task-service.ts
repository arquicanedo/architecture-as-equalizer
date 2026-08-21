
import {
    Task, CreateTaskInput, UpdateTaskInput, TaskId, UserId, ProjectId, TaskStatus
} from '../types';
import { EventBus } from '../event-bus';
import * as crypto from 'crypto';

export class TaskService {
    private tasks: Map<TaskId, Task>;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.tasks = new Map();
        this.eventBus = eventBus;
    }

    public async getTasksByProjectId(projectId: ProjectId): Promise<Task[]> {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    public async getTaskById(id: TaskId): Promise<Task | undefined> {
        return this.tasks.get(id);
    }

    public async createTask(input: CreateTaskInput): Promise<Task> {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title: input.title,
            description: input.description,
            status: TaskStatus.TODO, // Default status
            assigneeId: null,
            projectId: input.projectId,
        };
        this.tasks.set(newTask.id, newTask);
        return newTask;
    }

    public async updateTask(id: TaskId, input: UpdateTaskInput): Promise<Task | undefined> {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        if (input.title !== undefined) {
            task.title = input.title;
        }
        if (input.description !== undefined) {
            task.description = input.description;
        }

        this.tasks.set(id, task);
        return task;
    }

    public async deleteTask(id: TaskId): Promise<boolean> {
        return this.tasks.delete(id);
    }

    public async changeTaskStatus(id: TaskId, newStatus: TaskStatus): Promise<Task | 'invalid-transition' | undefined> {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const oldStatus = task.status;

        // Forward-only status transitions
        if (oldStatus === TaskStatus.TODO && newStatus === TaskStatus.IN_PROGRESS) {
            task.status = newStatus;
        } else if (oldStatus === TaskStatus.IN_PROGRESS && newStatus === TaskStatus.DONE) {
            task.status = newStatus;
        } else if (oldStatus === newStatus) {
            // Allow setting to current status (no change)
        } else {
            return 'invalid-transition';
        }

        this.tasks.set(id, task);
        this.eventBus.publish('task.statusChanged', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
            oldStatus: oldStatus,
            newStatus: newStatus,
        });
        return task;
    }

    public async assignTask(id: TaskId, assigneeId: UserId): Promise<Task | undefined> {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        task.assigneeId = assigneeId;

        this.tasks.set(id, task);
        this.eventBus.publish('task.assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: task.assigneeId,
        });
        return task;
    }
}
