import { User } from './types';
import { randomUUID } from 'crypto';

export class UserService {
    private users: Map<string, User> = new Map();

    createUser(name: string, email: string): User {
        const id = randomUUID();
        const user: User = { id, name, email };
        this.users.set(id, user);
        return user;
    }

    getUser(id: string): User | undefined {
        return this.users.get(id);
    }

    getUsers(): User[] {
        return Array.from(this.users.values());
    }

    updateUser(id: string, name?: string, email?: string): User | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }

        if (name) {
            user.name = name;
        }
        if (email) {
            user.email = email;
        }
        return user;
    }

    deleteUser(id: string): boolean {
        return this.users.delete(id);
    }
}
