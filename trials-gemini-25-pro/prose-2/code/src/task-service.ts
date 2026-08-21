import { Task, TaskStatus } from './types';
import { randomUUID } from 'crypto';
import { eventBus } from './event-bus';

export class TaskService {
    private tasks: Map<string, Task> = new Map();

    createTask(projectId: string, title: string, description: string): Task {
        const id = randomUUID();
        const task: Task = { id, projectId, title, description, status: 'todo' };
        this.tasks.set(id, task);
        return task;
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getTasksByProject(projectId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    }

    updateTask(id: string, title?: string, description?: string): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        if (title) {
            task.title = title;
        }
        if (description) {
            task.description = description;
        }
        return task;
    }

    deleteTask(id: string): boolean {
        const task = this.getTask(id);
        if(!task) return false;

        this.tasks.delete(id);
        return true;
    }

    assignTask(id: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }
        task.assigneeId = assigneeId;
        eventBus.publish('task.assigned', { taskId: id, assigneeId });
        return task;
    }

    updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        // Validate status transition
        const validTransitions: { [key in TaskStatus]?: TaskStatus[] } = {
            'todo': ['in-progress'],
            'in-progress': ['done'],
        };

        if (validTransitions[task.status]?.includes(status)) {
            task.status = status;
            eventBus.publish('task.statusChanged', { taskId: id, status, assigneeId: task.assigneeId });
            return task;
        }

        return undefined; // Invalid transition
    }
}
