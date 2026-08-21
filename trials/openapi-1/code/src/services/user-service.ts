// ============================================================
// User Service
// Owns the in-memory user store.
// No imports from other services; no event publishing.
// ============================================================

import { randomUUID } from 'crypto';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  ServiceResult,
  ok,
  fail,
} from '../types.js';

class UserService {
  private readonly store = new Map<string, User>();

  listUsers(): ServiceResult<User[]> {
    return ok(Array.from(this.store.values()));
  }

  getUser(id: string): ServiceResult<User> {
    const user = this.store.get(id);
    if (!user) return fail(404, `User "${id}" not found`);
    return ok(user);
  }

  createUser(input: CreateUserInput): ServiceResult<User> {
    if (!input.name?.trim()) return fail(400, 'Field "name" is required');
    if (!input.email?.trim()) return fail(400, 'Field "email" is required');

    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim(),
    };
    this.store.set(user.id, user);
    return ok(user);
  }

  updateUser(id: string, input: UpdateUserInput): ServiceResult<User> {
    const existing = this.store.get(id);
    if (!existing) return fail(404, `User "${id}" not found`);

    const updated: User = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
    };
    this.store.set(id, updated);
    return ok(updated);
  }

  deleteUser(id: string): ServiceResult<void> {
    if (!this.store.has(id)) return fail(404, `User "${id}" not found`);
    this.store.delete(id);
    return ok(undefined);
  }
}

export const userService = new UserService();
