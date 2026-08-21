import { User, ID } from '../types';

export class UserService {
  private store: Map<ID, User> = new Map();

  list(): User[] {
    return Array.from(this.store.values());
  }

  create(input: { name: string; email: string }): User {
    const id = Math.random().toString(36).slice(2, 9);
    const user: User = { id, ...input };
    this.store.set(id, user);
    return user;
  }

  get(id: ID): User | null {
    return this.store.get(id) ?? null;
  }

  update(id: ID, input: { name?: string; email?: string }): User | null {
    const u = this.store.get(id);
    if (!u) return null;
    const updated = { ...u, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: ID): boolean {
    return this.store.delete(id);
  }
}

export const userService = new UserService();
