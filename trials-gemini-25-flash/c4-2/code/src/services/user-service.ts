import { User, UUID } from '../types';
import * as crypto from 'crypto';

function generateUUID(): UUID {
    return crypto.randomUUID();
}

export class UserService {
    private users: Map<UUID, User> = new Map();

    constructor() {
        // Seed with some initial data for testing
        const user1Id = generateUUID();
        this.users.set(user1Id, { id: user1Id, name: 'Alice Smith', email: 'alice@example.com' });
        const user2Id = generateUUID();
        this.users.set(user2Id, { id: user2Id, name: 'Bob Johnson', email: 'bob@example.com' });
    }

    public create(name: string, email: string): User {
        if (!name || !email) {
            throw new Error('User name and email are required.');
        }
        const newUser: User = {
            id: generateUUID(),
            name,
            email,
        };
        this.users.set(newUser.id, newUser);
        return newUser;
    }

    public getById(id: UUID): User | undefined {
        return this.users.get(id);
    }

    public getAll(): User[] {
        return Array.from(this.users.values());
    }

    public update(id: UUID, name?: string, email?: string): User | undefined {
        const user = this.users.get(id);
        if (user) {
            if (name !== undefined) user.name = name;
            if (email !== undefined) user.email = email;
            return { ...user }; // Return a clone to prevent external modification
        }
        return undefined;
    }

    public delete(id: UUID): boolean {
        return this.users.delete(id);
    }
}
