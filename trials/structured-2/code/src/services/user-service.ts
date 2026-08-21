/**
 * User Service
 * Owns the user data store exclusively.
 * Data shape: { id, name, email }
 */

import { randomUUID } from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private store: Map<string, User> = new Map();

  create(data: { name: string; email: string }): User {
    if (!data.name || !data.email) {
      throw new Error("name and email are required");
    }
    const user: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
    };
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

  update(id: string, data: Partial<{ name: string; email: string }>): User {
    const user = this.getById(id);
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    this.store.set(id, user);
    return user;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`User not found: ${id}`);
    this.store.delete(id);
  }
}
