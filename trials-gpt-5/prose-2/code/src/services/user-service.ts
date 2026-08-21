export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  list(): User[] {
    return Array.from(this.users.values());
  }

  get(id: string): User | undefined {
    return this.users.get(id);
  }

  create(input: { name: string; email: string }): User {
    const id = this.generateId();
    const user: User = { id, name: input.name, email: input.email };
    this.users.set(id, user);
    return user;
  }

  update(id: string, input: Partial<Omit<User, 'id'>>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = { ...user, ...input, id };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
