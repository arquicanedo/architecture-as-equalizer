import { randomUUID } from 'crypto';
import type { User, CreateUserInput, UpdateUserInput } from '../types.js';

// ─── User Service ─────────────────────────────────────────────────────────────
// Owns the user store exclusively. No other service may read/write this store.

class UserService {
  private store: Map<string, User> = new Map();

  listUsers(): User[] {
    return Array.from(this.store.values());
  }

  getUser(id: string): User | undefined {
    return this.store.get(id);
  }

  createUser(input: CreateUserInput): User {
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
    };
    this.store.set(user.id, user);
    return user;
  }

  updateUser(id: string, input: UpdateUserInput): User | undefined {
    const user = this.store.get(id);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
    };
    this.store.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.store.delete(id);
  }
}

export const userService = new UserService();
