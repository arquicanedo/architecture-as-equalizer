/**
 * User Service
 * Manages users independently
 */

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
  private store: Map<string, User> = new Map();
  private idCounter: number = 0;

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `user_${++this.idCounter}`;
  }

  /**
   * List all users
   */
  listUsers(): User[] {
    return Array.from(this.store.values());
  }

  /**
   * Get user by ID
   */
  getUser(id: string): User | null {
    return this.store.get(id) || null;
  }

  /**
   * Create a new user
   */
  createUser(input: CreateUserInput): User {
    const user: User = {
      id: this.generateId(),
      name: input.name,
      email: input.email,
    };
    this.store.set(user.id, user);
    return user;
  }

  /**
   * Update a user
   */
  updateUser(id: string, input: UpdateUserInput): User | null {
    const user = this.store.get(id);
    if (!user) return null;

    const updated: User = {
      ...user,
      name: input.name ?? user.name,
      email: input.email ?? user.email,
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a user
   */
  deleteUser(id: string): boolean {
    return this.store.delete(id);
  }
}

export const userService = new UserService();
