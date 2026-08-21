/**
 * User Service - manages user data
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();
  private nextId: number = 1;

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
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
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
  updateUser(userId: string, name?: string, email?: string): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    this.users.set(userId, user);
    return user;
  }

  /**
   * Delete a user
   */
  deleteUser(userId: string): boolean {
    return this.users.delete(userId);
  }

  /**
   * Check if a user exists
   */
  userExists(userId: string): boolean {
    return this.users.has(userId);
  }
}

export const userService = new UserService();
