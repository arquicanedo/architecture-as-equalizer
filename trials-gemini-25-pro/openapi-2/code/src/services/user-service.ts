import crypto from "crypto";

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
    private users: Map<string, User> = new Map();

    createUser(input: CreateUserInput): User {
        const id = crypto.randomUUID();
        const user: User = { id, ...input };
        this.users.set(id, user);
        return user;
    }

    getUser(id: string): User | undefined {
        return this.users.get(id);
    }

    listUsers(): User[] {
        return Array.from(this.users.values());
    }

    updateUser(id: string, input: UpdateUserInput): User | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }
        const updatedUser = { ...user, ...input };
        this.users.set(id, updatedUser);
        return updatedUser;
    }

    deleteUser(id: string): boolean {
        return this.users.delete(id);
    }
}
