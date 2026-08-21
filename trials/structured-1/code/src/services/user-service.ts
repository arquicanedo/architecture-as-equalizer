/**
 * User Service — owns all user data.
 * Exposes plain TypeScript methods; no HTTP handling here.
 * Publishes no events and subscribes to none.
 */

import { randomUUID } from "crypto";
import { ApiError } from "../errors.js";

export interface User {
  id: string;
  name: string;
  email: string;
}

export type CreateUserInput = Omit<User, "id">;
export type UpdateUserInput = Partial<Omit<User, "id">>;

export class UserService {
  private readonly store = new Map<string, User>();

  create(input: CreateUserInput): User {
    if (!input.name || !input.name.trim()) {
      throw new ApiError("name and email are required", 400);
    }
    if (!input.email || !input.email.trim()) {
      throw new ApiError("name and email are required", 400);
    }
    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim(),
    };
    this.store.set(user.id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.store.get(id);
    if (!user) throw new ApiError(`User not found: ${id}`, 404);
    return user;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: UpdateUserInput): User {
    const user = this.getById(id);
    const updated: User = {
      ...user,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new ApiError(`User not found: ${id}`, 404);
    this.store.delete(id);
  }
}
