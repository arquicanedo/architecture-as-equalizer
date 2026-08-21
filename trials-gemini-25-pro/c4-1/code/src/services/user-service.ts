import { randomUUID } from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

class UserService {
    private userStore: Map<string, User> = new Map();

    create(name: string, email: string): User {
        const id = randomUUID();
        const user: User = { id, name, email };
        this.userStore.set(id, user);
        return user;
    }

    getById(id: string): User | undefined {
        return this.userStore.get(id);
    }

    getAll(): User[] {
        return Array.from(this.userStore.values());
    }

    update(id: string, name: string, email: string): User | undefined {
        const user = this.userStore.get(id);
        if (user) {
            user.name = name;
            user.email = email;
            return user;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.userStore.delete(id);
    }
}

export const userService = new UserService();
