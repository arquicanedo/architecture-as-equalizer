import { User, CreateUserInput, UpdateUserInput } from '../types';

// Simple id generator
function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class UserService {
  private store: Map<string, User> = new Map();

  list(): User[] {
    return Array.from(this.store.values());
  }

  create(input: CreateUserInput): User {
    const id = genId();
    const user: User = { id, name: input.name, email: input.email };
    this.store.set(id, user);
    return user;
  }

  get(id: string): User | null {
    return this.store.get(id) || null;
  }

  update(id: string, input: UpdateUserInput): User | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
