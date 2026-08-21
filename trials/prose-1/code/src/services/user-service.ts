/**
 * UserService — owns all user data.
 *
 * Provides full CRUD for users.  No other service stores user
 * records; if another service needs user information it must
 * receive it through event payloads or the router must
 * orchestrate the lookup.
 */

import { randomUUID } from "crypto";
import type { User, CreateUserInput, UpdateUserInput } from "../types.js";

export class UserService {
  private readonly users: Map<string, User> = new Map();

  // ── Create ────────────────────────────────────────────────────────────────

  createUser(input: CreateUserInput): User {
    if (!input.name || input.name.trim() === "") {
      throw new Error("User name is required.");
    }
    if (!input.email || input.email.trim() === "") {
      throw new Error("User email is required.");
    }
    if (!this.isValidEmail(input.email)) {
      throw new Error(`"${input.email}" is not a valid email address.`);
    }
    if (this.findByEmail(input.email)) {
      throw new Error(`A user with email "${input.email}" already exists.`);
    }

    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
    };

    this.users.set(user.id, user);
    return user;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getUser(id: string): User {
    const user = this.users.get(id);
    if (!user) throw new Error(`User "${id}" not found.`);
    return user;
  }

  listUsers(): User[] {
    return [...this.users.values()];
  }

  // ── Update ────────────────────────────────────────────────────────────────

  updateUser(id: string, input: UpdateUserInput): User {
    const user = this.getUser(id);

    if (input.email !== undefined) {
      if (!this.isValidEmail(input.email)) {
        throw new Error(`"${input.email}" is not a valid email address.`);
      }
      const existing = this.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new Error(`A user with email "${input.email}" already exists.`);
      }
      user.email = input.email.trim().toLowerCase();
    }

    if (input.name !== undefined) {
      if (input.name.trim() === "") throw new Error("User name cannot be empty.");
      user.name = input.name.trim();
    }

    return user;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteUser(id: string): void {
    if (!this.users.has(id)) throw new Error(`User "${id}" not found.`);
    this.users.delete(id);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns true if the user id exists (used by other services via the router). */
  userExists(id: string): boolean {
    return this.users.has(id);
  }

  private findByEmail(email: string): User | undefined {
    const lower = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === lower) return user;
    }
    return undefined;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}
