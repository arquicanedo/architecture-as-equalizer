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
  private users: Map<string, User> = new Map();

  list(): User[] {
    return Array.from(this.users.values());
  }

  create(input: CreateUserInput): User {
    const id = randomUUID();
    const user: User = { id, name: input.name, email: input.email };
    this.users.set(id, user);
    return user;
  }

  get(id: string): User | undefined {
    return this.users.get(id);
  }

  update(id: string, input: UpdateUserInput): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...input };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
