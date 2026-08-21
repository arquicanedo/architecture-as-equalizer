import { randomUUID } from 'crypto';

export type User = {
  id: string;
  name: string;
  email: string;
};

export class UserService {
  private users: Map<string, User> = new Map();

  createUser(name: string, email: string): User {
    const id = randomUUID();
    const user: User = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  updateUser(id: string, data: Partial<Omit<User, 'id'>>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  listUsers(): User[] {
    return Array.from(this.users.values());
  }
}
