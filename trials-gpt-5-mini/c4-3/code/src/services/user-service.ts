import { User, UUID } from '../types';
import { uuid } from '../utils';

export class UserService {
  private store: Map<UUID, User> = new Map();

  create(payload: { name: string; email: string }): User {
    const id = uuid();
    const user: User = { id, name: payload.name, email: payload.email };
    this.store.set(id, user);
    return user;
  }

  getById(id: UUID): User | null {
    return this.store.get(id) ?? null;
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: UUID, payload: { name?: string; email?: string }): User | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: User = { ...existing, ...payload };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: UUID): boolean {
    return this.store.delete(id);
  }
}
