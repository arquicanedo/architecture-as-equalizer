import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  create(name: string, email: string): User {
    const id = randomUUID();
    const user: User = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  list(): User[] {
    return Array.from(this.users.values());
  }

  get(id: string): User | undefined {
    return this.users.get(id);
  }

  update(id: string, updates: Partial<Omit<User, 'id'>>): User | undefined {
    const current = this.users.get(id);
    if (!current) return undefined;
    const updated: User = { ...current, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
