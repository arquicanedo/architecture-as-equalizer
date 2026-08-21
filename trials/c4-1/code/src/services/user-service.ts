/**
 * User Service — manages user CRUD operations.
 * Owns its own in-memory store. Publishes no events. Subscribes to no events.
 */

import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User not found: ${id}`);
    this.name = "UserNotFoundError";
  }
}

export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserValidationError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UserService {
  /** Service-owned store — no other service may access this directly. */
  private store: Map<string, User> = new Map();

  create(data: { name: string; email: string }): User {
    if (!data.name?.trim()) {
      throw new UserValidationError("name is required");
    }
    if (!data.email?.trim()) {
      throw new UserValidationError("email is required");
    }

    const user: User = {
      id: randomUUID(),
      name: data.name.trim(),
      email: data.email.trim(),
    };

    this.store.set(user.id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.store.get(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, data: Partial<{ name: string; email: string }>): User {
    const user = this.getById(id);

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new UserValidationError("name cannot be blank");
      user.name = data.name.trim();
    }
    if (data.email !== undefined) {
      if (!data.email.trim()) throw new UserValidationError("email cannot be blank");
      user.email = data.email.trim();
    }

    this.store.set(id, user);
    return user;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new UserNotFoundError(id);
    this.store.delete(id);
  }
}

/** Singleton instance exported for use in the router. */
export const userService = new UserService();
