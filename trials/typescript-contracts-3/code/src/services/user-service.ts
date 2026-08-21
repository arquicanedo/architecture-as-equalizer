// ============================================================
// User Service — IUserService implementation
// ============================================================

import { randomUUID } from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface IUserService {
  create(input: { name: string; email: string }): User;
  getById(id: string): User;
  getAll(): User[];
  update(id: string, input: Partial<{ name: string; email: string }>): User;
  delete(id: string): void;
}

class UserService implements IUserService {
  private store: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
    };
    this.store.set(user.id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.store.get(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    return user;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const user = this.getById(id);
    const updated: User = {
      ...user,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`User not found: ${id}`);
    }
    this.store.delete(id);
  }
}

export const userService = new UserService();
