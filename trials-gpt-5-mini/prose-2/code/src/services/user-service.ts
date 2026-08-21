import { User, ID } from '../types';
import { randomUUID } from 'crypto';

export class UserService {
  private users: Map<ID, User> = new Map();

  createUser(name: string, email: string): User {
    const id = randomUUID();
    const user: User = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  getUser(id: ID): User | undefined {
    return this.users.get(id);
  }

  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUser(id: ID, data: Partial<Omit<User, 'id'>>): User | undefined {
    const u = this.users.get(id);
    if (!u) return undefined;
    const updated = { ...u, ...data };
    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: ID): boolean {
    return this.users.delete(id);
  }
}
