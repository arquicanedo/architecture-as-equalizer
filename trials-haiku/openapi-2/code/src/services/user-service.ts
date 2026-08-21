/**
 * User Service
 * Manages user data. No other service may access this store.
 */

interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private store: Map<string, User> = new Map();
  private nextId = 1;

  /**
   * Create a new user
   */
  create(name: string, email: string): User {
    const id = `user-${this.nextId++}`;
    const user: User = { id, name, email };
    this.store.set(id, user);
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
  listAll(): User[] {
    return Array.from(this.store.values());
  }

  /**
   * Update user
   */
  update(id: string, updates: Partial<Omit<User, 'id'>>): User | undefined {
    const user = this.store.get(id);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      ...updates,
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete user
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }
}

export const userService = new UserService();
