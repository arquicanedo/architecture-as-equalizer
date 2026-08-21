import { randomUUID } from 'crypto';
import { User, IUserService } from '../types';

export class UserService implements IUserService {
    private users: Map<string, User> = new Map();

    create(input: { name: string; email: string }): User {
        const newUser: User = {
            id: randomUUID(),
            name: input.name,
            email: input.email,
        };
        this.users.set(newUser.id, newUser);
        return newUser;
    }

    getById(id: string): User {
        const user = this.users.get(id);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    getAll(): User[] {
        return Array.from(this.users.values());
    }

    update(id: string, input: Partial<{ name: string; email: string }>): User {
        const user = this.getById(id);
        if (input.name) {
            user.name = input.name;
        }
        if (input.email) {
            user.email = input.email;
        }
        this.users.set(id, user);
        return user;
    }

    delete(id: string): void {
        if (!this.users.delete(id)) {
            throw new Error('User not found');
        }
    }
}
