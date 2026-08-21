/**
 * User Service — manages user CRUD operations.
 * Owns its own in-memory data store (Map<string, User>).
 * Publishes no events; subscribes to no events.
 */

import { randomUUID } from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private store: Map<string, User> = new Map();

  create(name: string, email: string): User {
    if (!name || !email) {
      throw new Error("name and email are required");
    }
    const user: User = { id: randomUUID(), name, email };
    this.store.set(user.id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.store.get(id);
    if (!user) throw new Error(`User not found: ${id}`);
    return user;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, fields: Partial<Pick<User, "name" | "email">>): User {
    const user = this.getById(id);
    if (fields.name !== undefined) user.name = fields.name;
    if (fields.email !== undefined) user.email = fields.email;
    this.store.set(id, user);
    return user;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`User not found: ${id}`);
    this.store.delete(id);
  }
}
