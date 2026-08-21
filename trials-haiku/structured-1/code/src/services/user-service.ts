/**
 * User Service: Manages users
 * Data: { id, name, email }
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private store: Map<string, User> = new Map();
  private idCounter = 0;

  /**
   * Create a new user
   */
  create(name: string, email: string): User {
    const id = `u${++this.idCounter}`;
    const user: User = { id, name, email };
    this.store.set(id, user);
    return user;
  }

  /**
   * Get a user by ID
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
  update(id: string, updates: Partial<Omit<User, 'id'>>): User | undefined {
    const user = this.store.get(id);
    if (!user) return undefined;

    const updated = { ...user, ...updates };
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
