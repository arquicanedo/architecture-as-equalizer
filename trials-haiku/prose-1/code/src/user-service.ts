/**
 * User Service - Manages users
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
  createUser(name: string, email: string): User {
    const id = `user-${this.nextId++}`;
    const user: User = { id, name, email };
    this.users.set(id, user);
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

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;

    return user;
  }

  /**
   * Delete a user
   */
  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  /**
   * Check if a user exists
   */
  userExists(id: string): boolean {
    return this.users.has(id);
  }
}

export const userService = new UserService();
