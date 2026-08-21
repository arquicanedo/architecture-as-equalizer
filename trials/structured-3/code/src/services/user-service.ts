/**
 * User Service
 * Owns the user data store. Performs CRUD operations on users.
 * Publishes no events. Subscribes to no events.
 */

import { randomUUID } from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

export type CreateUserInput = Omit<User, "id">;
export type UpdateUserInput = Partial<Omit<User, "id">>;

export class UserService {
  private store: Map<string, User> = new Map();

  create(input: CreateUserInput): User {
    if (!input.name) {
      throw new Error("name is required");
    }
    if (!input.email) {
      throw new Error("email is required");
    }
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

  update(id: string, input: UpdateUserInput): User {
    const existing = this.getById(id);
    const updated: User = {
      ...existing,
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
