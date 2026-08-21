import crypto from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

export class UserService {
    private users: Map<string, User> = new Map();

    // Create
    create(data: { name: string; email: string }): User {
        const id = crypto.randomUUID();
        const user: User = { id, ...data };
        this.users.set(id, user);
        return user;
    }

    // Get All
    getAll(): User[] {
        return Array.from(this.users.values());
    }

    // Get by ID
    getById(id: string): User | undefined {
        return this.users.get(id);
    }

    // Update
    update(id: string, data: Partial<Omit<User, 'id'>>): User | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }
        const updatedUser = { ...user, ...data };
        this.users.set(id, updatedUser);
        return updatedUser;
    }

    // Delete
    delete(id: string): boolean {
        return this.users.delete(id);
    }
}
