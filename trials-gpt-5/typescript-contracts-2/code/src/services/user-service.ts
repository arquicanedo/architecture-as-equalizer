import { IUserService, User, IUserLookup } from "../types";
import { randomUUID } from "crypto";

export class UserService implements IUserService, IUserLookup {
  // RULE 2: exclusive data ownership
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
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated: User = { ...user, ...input };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.users.delete(id)) {
      throw new Error("User not found");
    }
  }

  // IUserLookup implementation
  getUserName(userId: string): string {
    const u = this.users.get(userId);
    if (!u) throw new Error("User not found");
    return u.name;
  }
}
