
import { User, CreateUserInput, UpdateUserInput, UserId } from '../types';
import * as crypto from 'crypto';

export class UserService {
    private users: Map<UserId, User>;

    constructor() {
        this.users = new Map();
    }

    public async getAllUsers(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    public async getUserById(id: UserId): Promise<User | undefined> {
        return this.users.get(id);
    }

    public async createUser(input: CreateUserInput): Promise<User> {
        const newUser: User = {
            id: crypto.randomUUID(),
            name: input.name,
            email: input.email,
        };
        this.users.set(newUser.id, newUser);
        return newUser;
    }

    public async updateUser(id: UserId, input: UpdateUserInput): Promise<User | undefined> {
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

        this.users.set(id, user); // Re-set to ensure map updates if user object was copied
        return user;
    }

    public async deleteUser(id: UserId): Promise<boolean> {
        return this.users.delete(id);
    }
}
