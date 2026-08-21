export type User = {
  id: string;
  name: string;
  email: string;
};

export class UserService {
  private users: Map<string, User> = new Map();

  create(user: Omit<User, 'id'> & { id?: string }): User {
    const id = user.id ?? this.generateId();
    const u: User = { id, name: user.name, email: user.email };
    this.users.set(id, u);
    return u;
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  update(id: string, data: Partial<Omit<User, 'id'>>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
