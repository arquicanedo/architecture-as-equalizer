/**
 * User Service
 * Manages user data and operations.
 * Each service owns its own data store.
 */

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

class UserService {
  private store: Map<string, User> = new Map();

  /**
   * Get all users.
   */
  getAllUsers(): User[] {
    return Array.from(this.store.values());
  }

  /**
   * Get a user by ID.
   */
  getUserById(id: string): User | undefined {
    return this.store.get(id);
  }

  /**
   * Create a new user.
   */
  createUser(input: CreateUserInput): User {
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
    };
    this.store.set(user.id, user);
    return user;
  }

  /**
   * Update a user.
   * Returns the updated user or undefined if not found.
   */
  updateUser(id: string, input: UpdateUserInput): User | undefined {
    const user = this.store.get(id);
    if (!user) return undefined;

    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;

    this.store.set(id, user);
    return user;
  }

  /**
   * Delete a user.
   * Returns true if deleted, false if not found.
   */
  deleteUser(id: string): boolean {
    return this.store.delete(id);
  }
}

export const userService = new UserService();
