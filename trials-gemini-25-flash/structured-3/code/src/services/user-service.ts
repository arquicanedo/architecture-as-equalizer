import { randomUUID } from 'crypto';

export interface User {
    id: string;
    name: string;
    email: string;
}

class UserService {
    private users: Map<string, User>;

    constructor() {
        this.users = new Map();
    }

    /**
     * Creates a new user.
     * @param name The name of the user.
     * @param email The email of the user.
     * @returns The created user.
     */
    create(name: string, email: string): User {
        if (!name || !email) {
            throw new Error('Name and email are required.');
        }
        const id = randomUUID();
        const newUser: User = { id, name, email };
        this.users.set(id, newUser);
        return newUser;
    }

    /**
     * Retrieves a user by their ID.
     * @param id The ID of the user.
     * @returns The user, or undefined if not found.
     */
    getById(id: string): User | undefined {
        return this.users.get(id);
    }

    /**
     * Retrieves all users.
     * @returns An array of all users.
     */
    getAll(): User[] {
        return Array.from(this.users.values());
    }

    /**
     * Updates an existing user.
     * @param id The ID of the user to update.
     * @param updates An object containing the fields to update (name, email).
     * @returns The updated user, or undefined if the user was not found.
     */
    update(id: string, updates: { name?: string; email?: string }): User | undefined {
        const user = this.users.get(id);
        if (user) {
            if (updates.name !== undefined) user.name = updates.name;
            if (updates.email !== undefined) user.email = updates.email;
            this.users.set(id, user); // Re-set to ensure Map updates if value is mutated directly
            return user;
        }
        return undefined;
    }

    /**
     * Deletes a user by their ID.
     * @param id The ID of the user to delete.
     * @returns True if the user was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.users.delete(id);
    }
}

export const userService = new UserService();
