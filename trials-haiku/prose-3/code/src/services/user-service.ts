/**
 * User Service - Manages user data
 */

import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  /**
   * Create a new user
   */
  createUser(name: string, email: string): User {
    const user: User = {
      id: randomUUID(),
      name,
      email,
    };
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Get a user by ID
   */
  getUser(id: string): User | null {
    return this.users.get(id) || null;
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Update a user
   */
  updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    const updated: User = {
      ...user,
      ...updates,
      id: user.id, // Ensure ID doesn't change
    };
    this.users.set(id, updated);
    return updated;
  }

  /**
   * Delete a user
   */
  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
