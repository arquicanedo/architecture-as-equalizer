import { randomUUID } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export class UserService {
  private store: Map<string, User> = new Map();

  list(): User[] {
    return Array.from(this.store.values());
  }

  create(input: CreateUserInput): User {
    const id = randomUUID();
    const user: User = { id, name: input.name, email: input.email };
    this.store.set(id, user);
    return user;
  }

  get(id: string): User | null {
    return this.store.get(id) ?? null;
  }

  update(id: string, input: UpdateUserInput): User | null {
    const u = this.store.get(id);
    if (!u) return null;
    const updated: User = { ...u, name: input.name ?? u.name, email: input.email ?? u.email };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
