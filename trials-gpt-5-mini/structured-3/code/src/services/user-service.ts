export type User = { id: string; name: string; email: string };

export class UserService {
  private store: Map<string, User> = new Map();

  create(user: User): User {
    if (this.store.has(user.id)) throw new Error('User exists');
    this.store.set(user.id, user);
    return user;
  }

  getById(id: string): User | undefined {
    return this.store.get(id);
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<User>): User {
    const existing = this.store.get(id);
    if (!existing) throw new Error('Not found');
    const updated = { ...existing, ...patch, id };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    this.store.delete(id);
  }
}
