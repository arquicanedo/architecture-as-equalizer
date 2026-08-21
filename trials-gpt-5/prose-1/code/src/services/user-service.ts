import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  create(name: string, email: string): User {
    const user: User = { id: randomUUID(), name, email };
    this.users.set(user.id, user);
    return user;
  }

  list(): User[] {
    return Array.from(this.users.values());
  }

  get(id: string): User | undefined {
    return this.users.get(id);
  }

  update(id: string, updates: Partial<Omit<User, 'id'>>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...updates, id: existing.id };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
