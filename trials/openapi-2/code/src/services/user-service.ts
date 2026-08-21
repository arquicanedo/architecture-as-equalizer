import { randomUUID } from "crypto";

// ── Domain types ────────────────────────────────────────────────────────────

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

// ── Service ─────────────────────────────────────────────────────────────────

export class UserService {
  /** Owned data store — no other service may access this. */
  private store: Map<string, User> = new Map();

  listAll(): User[] {
    return Array.from(this.store.values());
  }

  getById(id: string): User | undefined {
    return this.store.get(id);
  }

  create(input: CreateUserInput): User {
    if (!input.name || input.name.trim() === "") {
      throw new Error("User name is required.");
    }
    if (!input.email || input.email.trim() === "") {
      throw new Error("User email is required.");
    }

    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim(),
    };

    this.store.set(user.id, user);
    return user;
  }

  update(id: string, input: UpdateUserInput): User | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: User = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
    };

    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
