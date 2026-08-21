import { randomUUID } from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

export class UserService {
    private users: Map<string, User>;

    constructor() {
        this.users = new Map();
    }

    create(name: string, email: string): User {
        const id = randomUUID();
        const newUser: User = { id, name, email };
        this.users.set(id, newUser);
        return newUser;
    }

    getById(id: string): User | undefined {
        return this.users.get(id);
    }

    getAll(): User[] {
        return Array.from(this.users.values());
    }

    update(id: string, name?: string, email?: string): User | undefined {
        const user = this.users.get(id);
        if (user) {
            if (name !== undefined) user.name = name;
            if (email !== undefined) user.email = email;
            this.users.set(id, user); // Re-set to ensure map updates if applicable
            return user;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.users.delete(id);
    }

    // Helper for notification service to get user name
    getNameById(id: string): string | undefined {
        return this.users.get(id)?.name;
    }
}
