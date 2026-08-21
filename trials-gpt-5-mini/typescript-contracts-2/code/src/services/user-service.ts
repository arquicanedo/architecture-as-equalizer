import { IUserService, User } from "../types";

const genId = (): string => {
  if (typeof (globalThis as any).crypto?.randomUUID === "function") return (globalThis as any).crypto.randomUUID();
  return "u-" + Math.random().toString(36).slice(2, 10);
};

export class UserService implements IUserService {
  private store: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = genId();
    const user: User = { id, name: input.name, email: input.email };
    this.store.set(id, user);
    return user;
  }

  getById(id: string): User {
    const u = this.store.get(id);
    if (!u) throw new Error("User not found");
    return u;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const u = this.getById(id);
    const updated = { ...u, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.delete(id)) throw new Error("User not found");
  }
}
