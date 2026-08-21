
import { eventBus } from './event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId?: string;
}

export class TaskService {
    private tasks = new Map<string, Task>();
    private nextId = 1;

    createTask(projectId: string, title: string, description: string): Task {
        const id = `task-${this.nextId++}`;
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

    updateTask(id: string, title: string, description: string): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            task.title = title;
            task.description = description;
            return task;
        }
        return undefined;
    }

    deleteTask(id: string): boolean {
        return this.tasks.delete(id);
    }

    updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
        const task = this.tasks.get(id);
        if (!task) {
            return undefined;
        }

        const validTransitions: { [key in TaskStatus]?: TaskStatus[] } = {
            'todo': ['in-progress'],
            'in-progress': ['done']
        };

        if (validTransitions[task.status]?.includes(status)) {
            task.status = status;
            eventBus.publish('task.statusChanged', task);
            return task;
        }

        return undefined;
    }

    assignTask(id: string, assigneeId: string): Task | undefined {
        const task = this.tasks.get(id);
        if (task) {
            task.assigneeId = assigneeId;
            eventBus.publish('task.assigned', task);
            return task;
        }
        return undefined;
    }
}
