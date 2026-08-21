import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private store: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const user: User = { id: randomUUID(), name: input.name, email: input.email };
    this.store.set(user.id, user);
    return user;
  }

  getById(id: string): User | undefined {
    return this.store.get(id);
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, updates: Partial<Omit<User, 'id'>>): User | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...updates, id: existing.id };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
