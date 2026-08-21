import { randomUUID } from "crypto";
import { User } from "./types";

/**
 * UserService — owns all user data.
 *
 * No other service should read from or write to this store directly.
 * If another part of the system needs to verify a user exists it should
 * call the public methods exposed here via the router orchestration layer.
 */
export class UserService {
  private users: Map<string, User> = new Map();

  // ── CRUD ──────────────────────────────────────────────────────────────────

  createUser(data: { name: string; email: string }): User {
    if (!data.name || !data.email) {
      throw new Error("name and email are required");
    }

    // Guard against duplicate emails
    for (const u of this.users.values()) {
      if (u.email === data.email) {
        throw new Error(`A user with email "${data.email}" already exists`);
      }
    }

    const user: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
    };

    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User {
    const user = this.users.get(id);
    if (!user) throw new Error(`User "${id}" not found`);
    return user;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUser(id: string, data: Partial<{ name: string; email: string }>): User {
    const user = this.getUser(id);

    // Guard against duplicate emails when changing email
    if (data.email && data.email !== user.email) {
      for (const u of this.users.values()) {
        if (u.email === data.email) {
          throw new Error(`A user with email "${data.email}" already exists`);
        }
      }
    }

    const updated: User = {
      ...user,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    };

    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): void {
    if (!this.users.has(id)) throw new Error(`User "${id}" not found`);
    this.users.delete(id);
  }

  /** Convenience: returns true if a user with this id exists. */
  exists(id: string): boolean {
    return this.users.has(id);
  }
}
