import { randomUUID } from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

const users = new Map<string, User>();

export const userService = {
    create: (data: { name: string; email: string }): User => {
        const id = randomUUID();
        const user = { ...data, id };
        users.set(id, user);
        return user;
    },

    getById: (id: string): User | undefined => {
        return users.get(id);
    },

    getAll: (): User[] => {
        return Array.from(users.values());
    },

    update: (id: string, data: Partial<Omit<User, 'id'>>): User | undefined => {
        const user = users.get(id);
        if (!user) {
            return undefined;
        }
        const updatedUser = { ...user, ...data };
        users.set(id, updatedUser);
        return updatedUser;
    },

    delete: (id: string): boolean => {
        return users.delete(id);
    }
};
