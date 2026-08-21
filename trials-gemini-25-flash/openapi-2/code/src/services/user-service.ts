import { randomUUID } from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface CreateUserInput {
    name: string;
    email: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
}

export class UserService {
    private users: Map<string, User>;

    constructor() {
        this.users = new Map();
    }

    listUsers(): User[] {
        return Array.from(this.users.values());
    }

    getUser(id: string): User | undefined {
        return this.users.get(id);
    }

    createUser(input: CreateUserInput): User {
        const newUser: User = {
            id: randomUUID(),
            name: input.name,
            email: input.email,
        };
        this.users.set(newUser.id, newUser);
        return newUser;
    }

    updateUser(id: string, input: UpdateUserInput): User | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }

        if (input.name !== undefined) {
            user.name = input.name;
        }
        if (input.email !== undefined) {
            user.email = input.email;
        }
        this.users.set(id, user); // Update the map with the modified user object
        return user;
    }

    deleteUser(id: string): boolean {
        return this.users.delete(id);
    }
}
