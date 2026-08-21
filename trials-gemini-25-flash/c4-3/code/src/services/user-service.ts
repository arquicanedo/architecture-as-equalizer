import { randomUUID } from 'crypto';

/**
 * @deprecated Use `src/types/user.ts` once type definitions are centralized
 */
export interface User {
    id: string;
    name: string;
    email: string;
}

/**
 * Manages user CRUD operations.
 * Adheres to ADR-002: Service-Owned Data Stores.
 */
export class UserService {
    private userStore: Map<string, User>;

    constructor() {
        this.userStore = new Map();
    }

    /**
     * Creates a new user.
     * @param name The name of the user.
     * @param email The email of the user (must be unique).
     * @returns The newly created user, or undefined if email already exists.
     */
    create(name: string, email: string): User | undefined {
        // Check for unique email
        for (const user of this.userStore.values()) {
            if (user.email === email) {
                return undefined; // Email already exists
            }
        }

        const newUser: User = {
            id: randomUUID(),
            name,
            email,
        };
        this.userStore.set(newUser.id, newUser);
        return newUser;
    }

    /**
     * Retrieves a user by their ID.
     * @param id The ID of the user.
     * @returns The user, or undefined if not found.
     */
    getById(id: string): User | undefined {
        return this.userStore.get(id);
    }

    /**
     * Retrieves all users.
     * @returns An array of all users.
     */
    getAll(): User[] {
        return Array.from(this.userStore.values());
    }

    /**
     * Updates an existing user.
     * @param id The ID of the user to update.
     * @param updates An object containing the fields to update (name, email).
     * @returns The updated user, or undefined if not found or email conflicts.
     */
    update(id: string, updates: { name?: string; email?: string }): User | undefined {
        const user = this.userStore.get(id);
        if (!user) {
            return undefined; // User not found
        }

        if (updates.email) {
            // Check for unique email if email is being updated
            for (const existingUser of this.userStore.values()) {
                if (existingUser.id !== id && existingUser.email === updates.email) {
                    return undefined; // Email already exists for another user
                }
            }
            user.email = updates.email;
        }
        if (updates.name) {
            user.name = updates.name;
        }

        this.userStore.set(id, user); // Re-set to ensure map update if object reference changes (though not strictly necessary here)
        return { ...user }; // Return a copy to prevent external modification of internal state
    }

    /**
     * Deletes a user by their ID.
     * @param id The ID of the user to delete.
     * @returns True if the user was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.userStore.delete(id);
    }
}
