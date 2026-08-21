import { User, UUID } from '../types';
import { randomUUID } from 'crypto';

class UserService {
    private users: Map<UUID, User>;

    constructor() {
        this.users = new Map<UUID, User>();
    }

    /**
     * Creates a new user.
     * @param name User's display name.
     * @param email User's email address.
     * @returns The newly created user.
     */
    create(name: string, email: string): User {
        if (!name || !email) {
            throw new Error("Name and email are required for user creation.");
        }
        if (Array.from(this.users.values()).some(user => user.email === email)) {
            throw new Error(`User with email ${email} already exists.`);
        }

        const id: UUID = randomUUID();
        const newUser: User = { id, name, email };
        this.users.set(id, newUser);
        return newUser;
    }

    /**
     * Retrieves a user by their ID.
     * @param id The user's UUID.
     * @returns The user, or undefined if not found.
     */
    getById(id: UUID): User | undefined {
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
     * @param updates An object containing fields to update (name, email).
     * @returns The updated user, or undefined if the user was not found.
     */
    update(id: UUID, updates: { name?: string, email?: string }): User | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }

        const updatedUser = { ...user, ...updates };

        // Check for duplicate email if email is being updated
        if (updates.email && updates.email !== user.email) {
            if (Array.from(this.users.values()).some(u => u.email === updates.email && u.id !== id)) {
                throw new Error(`User with email ${updates.email} already exists.`);
            }
        }
        
        this.users.set(id, updatedUser);
        return updatedUser;
    }

    /**
     * Deletes a user by their ID.
     * @param id The ID of the user to delete.
     * @returns True if the user was deleted, false otherwise.
     */
    delete(id: UUID): boolean {
        return this.users.delete(id);
    }
}

export const userService = new UserService();
