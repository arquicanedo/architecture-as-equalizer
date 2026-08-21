import { randomBytes } from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

export class UserService {
    private users: Map<string, User> = new Map();

    createUser(name: string, email: string): User {
        const id = randomBytes(16).toString('hex');
        const user: User = { id, name, email };
        this.users.set(id, user);
        return user;
    }

    getUser(id: string): User | undefined {
        return this.users.get(id);
    }

    getAllUsers(): User[] {
        return Array.from(this.users.values());
    }

    updateUser(id: string, name: string, email: string): User | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }
        user.name = name;
        user.email = email;
        this.users.set(id, user);
        return user;
    }

    deleteUser(id: string): boolean {
        return this.users.delete(id);
    }
}
