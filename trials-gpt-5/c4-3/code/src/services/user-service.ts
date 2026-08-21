import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = { id, name: input.name, email: input.email };
    this.users.set(id, user);
    return user;
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, patch: Partial<Omit<User, 'id'>>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...patch, id };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
