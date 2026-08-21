export type User = { id: string; name: string; email: string };

export class UserService {
  private store: Map<string, User> = new Map();

  create(user: User) {
    if (this.store.has(user.id)) throw new Error('User exists');
    this.store.set(user.id, user);
    return user;
  }

  getById(id: string) {
    return this.store.get(id) ?? null;
  }

  getAll() {
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<User>) {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string) {
    return this.store.delete(id);
  }
}
