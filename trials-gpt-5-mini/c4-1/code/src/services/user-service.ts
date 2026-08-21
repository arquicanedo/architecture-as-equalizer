import { randomUUID } from 'crypto';

export type User = {
  id: string;
  name: string;
  email: string;
};

export class UserService {
  private store: Map<string, User> = new Map();

  create(data: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = { id, name: data.name, email: data.email };
    this.store.set(id, user);
    return user;
  }

  getById(id: string): User | null {
    return this.store.get(id) ?? null;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, data: Partial<Omit<User, 'id'>>): User | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
