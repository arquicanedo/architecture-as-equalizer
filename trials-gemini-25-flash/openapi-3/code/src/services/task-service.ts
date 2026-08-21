import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../models';
import { EventBus } from '../event-bus';
import { randomUUID } from 'crypto';

export class TaskService {
    private tasks: Map<string, Task> = new Map();
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public async listTasks(projectId: string): Promise<Task[]> {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    public async getTask(id: string): Promise<Task | undefined> {
        return this.tasks.get(id);
    }

    public async createTask(input: CreateTaskInput): Promise<Task> {
        const newTask: Task = {
            id: randomUUID(),
            title: input.title,
            description: input.description,
            status: 'todo', // Initial status
            assigneeId: null,
            projectId: input.projectId,
        };
        this.tasks.set(newTask.id, newTask);
        return newTask;
    }

    public async updateTask(id: string, input: UpdateTaskInput): Promise<Task | undefined> {
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

    public async deleteTask(id: string): Promise<boolean> {
        return this.tasks.delete(id);
    }

    public async changeTaskStatus(id: string, newStatus: TaskStatus): Promise<Task | undefined | 'invalid_transition'> {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const currentStatus = task.status;
        const validTransitions: Record<TaskStatus, TaskStatus[]> = {
            'todo': ['in-progress'],
            'in-progress': ['done'],
            'done': [], // No transitions from done
        };

        if (!validTransitions[currentStatus].includes(newStatus) && newStatus !== currentStatus) {
            return 'invalid_transition';
        }

        if (newStatus !== currentStatus) {
            const oldStatus = task.status;
            task.status = newStatus;
            this.tasks.set(id, task);
            this.eventBus.publish('task.statusChanged', {
                taskId: task.id,
                taskTitle: task.title,
                assigneeId: task.assigneeId,
                oldStatus: oldStatus,
                newStatus: newStatus,
            });
        }

        return task;
    }

    public async assignTask(id: string, assigneeId: string): Promise<Task | undefined> {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        task.assigneeId = assigneeId;
        this.tasks.set(id, task);
        this.eventBus.publish('task.assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: assigneeId,
        });
        return task;
    }
}
