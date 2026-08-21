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

  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  createUser(input: CreateUserInput): User {
    const user: User = { id: randomUUID(), name: input.name, email: input.email };
    this.users.set(user.id, user);
    return user;
    }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  updateUser(id: string, input: UpdateUserInput): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...input };
    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
