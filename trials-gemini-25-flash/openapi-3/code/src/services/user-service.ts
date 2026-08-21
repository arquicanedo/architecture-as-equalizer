import { User, CreateUserInput, UpdateUserInput } from '../models';
import { randomUUID } from 'crypto';

export class UserService {
    private users: Map<string, User> = new Map();

    constructor() {
        // Seed with a default user
        const defaultUser: User = {
            id: randomUUID(),
            name: "John Doe",
            email: "john.doe@example.com"
        };
        this.users.set(defaultUser.id, defaultUser);
    }

    public async listUsers(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    public async getUser(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    public async createUser(input: CreateUserInput): Promise<User> {
        const newUser: User = {
            id: randomUUID(),
            name: input.name,
            email: input.email,
        };
        this.users.set(newUser.id, newUser);
        return newUser;
    }

    public async updateUser(id: string, input: UpdateUserInput): Promise<User | undefined> {
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
        this.users.set(id, user);
        return user;
    }

    public async deleteUser(id: string): Promise<boolean> {
        return this.users.delete(id);
    }
}
