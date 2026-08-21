import { randomUUID } from "crypto";
import { IUserService, User } from "../types.js";

export class UserService implements IUserService {
  private store: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
    };
    this.store.set(user.id, user);
    return { ...user };
  }

  getById(id: string): User {
    const user = this.store.get(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    return { ...user };
  }

  getAll(): User[] {
    return Array.from(this.store.values()).map((u) => ({ ...u }));
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const user = this.store.get(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;
    this.store.set(id, user);
    return { ...user };
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`User not found: ${id}`);
    }
    this.store.delete(id);
  }
}
