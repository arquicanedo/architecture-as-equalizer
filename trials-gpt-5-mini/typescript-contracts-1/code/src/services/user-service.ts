import { IUserService, User } from "../types";
import { randomUUID } from "crypto";

export class UserService implements IUserService {
  // exclusive private store
  private store: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = { id, name: input.name, email: input.email };
    this.store.set(id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.store.get(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const user = this.getById(id);
    const updated: User = { ...user, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error("User not found");
    this.store.delete(id);
  }
}
