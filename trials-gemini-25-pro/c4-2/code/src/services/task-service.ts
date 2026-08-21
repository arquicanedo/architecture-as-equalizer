import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigneeId: string | null;
    projectId: string;
}

const tasks = new Map<string, Task>();
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    todo: ['in-progress'],
    'in-progress': ['done'],
    done: []
};

export const taskService = {
    create: (data: { title: string; description: string; projectId: string }): Task => {
        const id = randomUUID();
        const task: Task = { ...data, id, status: 'todo', assigneeId: null };
        tasks.set(id, task);
        return task;
    },

    getById: (id: string): Task | undefined => {
        return tasks.get(id);
    },

    getByProject: (projectId: string): Task[] => {
        return Array.from(tasks.values()).filter(task => task.projectId === projectId);
    },

    update: (id: string, data: Partial<Omit<Task, 'id' | 'status' | 'assigneeId' | 'projectId'>>): Task | undefined => {
        const task = tasks.get(id);
        if (!task) {
            return undefined;
        }
        const updatedTask = { ...task, ...data };
        tasks.set(id, updatedTask);
        return updatedTask;
    },

    delete: (id: string): boolean => {
        return tasks.delete(id);
    },

    assign: (id: string, assigneeId: string): Task | undefined => {
        const task = tasks.get(id);
        if (!task) {
            return undefined;
        }
        task.assigneeId = assigneeId;
        tasks.set(id, task);
        eventBus.publish('task.assigned', { 
            taskId: task.id, 
            taskTitle: task.title, 
            assigneeId: task.assigneeId 
        });
        return task;
    },

    changeStatus: (id: string, newStatus: TaskStatus): Task | undefined => {
        const task = tasks.get(id);
        if (!task) {
            return undefined;
        }
        const oldStatus = task.status;
        if (validTransitions[oldStatus].includes(newStatus)) {
            task.status = newStatus;
            tasks.set(id, task);
            eventBus.publish('task.statusChanged', { 
                taskId: task.id, 
                taskTitle: task.title, 
                assigneeId: task.assigneeId,
                oldStatus,
                newStatus 
            });
            return task;
        } 
        // Or throw an error, for now just returning undefined for invalid transition
        return undefined; 
    }
};
