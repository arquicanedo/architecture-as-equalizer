import { randomUUID } from 'crypto';
import { CreateUserInput, UpdateUserInput, User, UUID } from '../types';

export class UserService {
  private users: Map<UUID, User> = new Map();

  list(): User[] {
    return Array.from(this.users.values());
  }

  create(input: CreateUserInput): User {
    const user: User = { id: randomUUID(), name: input.name, email: input.email };
    this.users.set(user.id, user);
    return user;
  }

  get(id: UUID): User | undefined {
    return this.users.get(id);
  }

  update(id: UUID, input: UpdateUserInput): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...input };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: UUID): boolean {
    return this.users.delete(id);
  }
}
