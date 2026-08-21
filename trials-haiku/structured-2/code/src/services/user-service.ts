/**
 * User Service - Manages user data
 * Data ownership: User records (id, name, email)
 * No events published or subscribed
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  /**
   * Create a new user
   */
  create(name: string, email: string): User {
    const id = `user_${this.nextId++}`;
    const user: User = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  getById(id: string): User | null {
    return this.users.get(id) || null;
  }

  /**
   * Get all users
   */
  getAll(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Update user
   */
  update(id: string, updates: Partial<User>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates, id };
    this.users.set(id, updated);
    return updated;
  }

  /**
   * Delete user
   */
  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
