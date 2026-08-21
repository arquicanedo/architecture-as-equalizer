import { IUserService, User } from "../types";
import { randomUUID } from "crypto";

export class UserService implements IUserService {
  // Exclusive data ownership
  private users: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = { id, name: input.name, email: input.email };
    this.users.set(id, user);
    return user;
  }

  getById(id: string): User {
    const u = this.users.get(id);
    if (!u) throw new Error(`User not found: ${id}`);
    return u;
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const u = this.getById(id);
    const updated: User = { ...u, ...input } as User;
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.users.delete(id)) {
      throw new Error(`User not found: ${id}`);
    }
  }
}

export default UserService;
