// User Service - Manages user data
import { randomUUID } from "crypto";

interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private store: Map<string, User> = new Map();

  /**
   * Create a new user
   */
  create(name: string, email: string): User {
    const user: User = {
      id: randomUUID(),
      name,
      email,
    };
    this.store.set(user.id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  getById(id: string): User | undefined {
    return this.store.get(id);
  }

  /**
   * Get all users
   */
  getAll(): User[] {
    return Array.from(this.store.values());
  }

  /**
   * Update a user
   */
  update(id: string, updates: Partial<User>): User | undefined {
    const user = this.store.get(id);
    if (!user) return undefined;

    const updated = { ...user, ...updates, id };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a user
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }
}

export const userService = new UserService();
