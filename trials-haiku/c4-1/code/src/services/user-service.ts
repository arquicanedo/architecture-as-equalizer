/**
 * User Service - Manages user CRUD operations
 */

import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService {
  private userStore: Map<string, User> = new Map();

  /**
   * Create a new user
   */
  create(req: CreateUserRequest): User {
    const user: User = {
      id: randomUUID(),
      name: req.name,
      email: req.email,
    };
    this.userStore.set(user.id, user);
    return user;
  }

  /**
   * Get a user by ID
   */
  getById(id: string): User | undefined {
    return this.userStore.get(id);
  }

  /**
   * Get all users
   */
  getAll(): User[] {
    return Array.from(this.userStore.values());
  }

  /**
   * Update a user
   */
  update(id: string, req: UpdateUserRequest): User | undefined {
    const user = this.userStore.get(id);
    if (!user) {
      return undefined;
    }
    if (req.name !== undefined) {
      user.name = req.name;
    }
    if (req.email !== undefined) {
      user.email = req.email;
    }
    return user;
  }

  /**
   * Delete a user
   */
  delete(id: string): boolean {
    return this.userStore.delete(id);
  }
}

export const userService = new UserService();
