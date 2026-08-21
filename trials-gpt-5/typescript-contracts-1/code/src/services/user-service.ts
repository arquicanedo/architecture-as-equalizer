import { randomUUID } from "node:crypto";
import { IUserService, User } from "../types";

export class UserService implements IUserService {
  // Exclusive in-memory data store for users
  private users: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = { id, name: input.name, email: input.email };
    this.users.set(id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    const updated: User = {
      ...existing,
      ...input,
    };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.users.has(id)) throw new Error("User not found");
    this.users.delete(id);
  }

  // Helper for other layers (not other services): get user name by id
  public getUserName(id: string): string | null {
    const user = this.users.get(id);
    return user ? user.name : null;
  }
}
