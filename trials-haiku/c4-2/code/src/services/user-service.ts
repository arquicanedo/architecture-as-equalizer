/**
 * User Service
 * Manages user CRUD operations
 */

import { randomUUID } from "crypto";

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
  private userStore: Map<string, User> = new Map();

  /**
   * Create a new user
   */
  create(input: CreateUserInput): User {
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
    };
    this.userStore.set(user.id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  getById(id: string): User | null {
    return this.userStore.get(id) || null;
  }

  /**
   * Get all users
   */
  getAll(): User[] {
    return Array.from(this.userStore.values());
  }

  /**
   * Update user
   */
  update(id: string, input: UpdateUserInput): User | null {
    const user = this.userStore.get(id);
    if (!user) return null;

    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;

    this.userStore.set(id, user);
    return user;
  }

  /**
   * Delete user
   */
  delete(id: string): boolean {
    return this.userStore.delete(id);
  }
}

export const userService = new UserService();
