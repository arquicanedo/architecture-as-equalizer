import { User, IUserService } from '../types';
import * as crypto from 'node:crypto';

export class UserService implements IUserService {
  private users = new Map<string, User>();

  constructor() {
    // Seed with some initial data for demo/testing
    const user1: User = { id: crypto.randomUUID(), name: 'Alice Smith', email: 'alice@example.com' };
    const user2: User = { id: crypto.randomUUID(), name: 'Bob Johnson', email: 'bob@example.com' };
    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
  }

  create(input: { name: string; email: string }): User {
    const newUser: User = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  getById(id: string): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    return user;
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const user = this.getById(id);
    if (input.name !== undefined) {
      user.name = input.name;
    }
    if (input.email !== undefined) {
      user.email = input.email;
    }
    this.users.set(id, user); // Ensure map is updated with potentially modified object
    return user;
  }

  delete(id: string): void {
    if (!this.users.has(id)) {
      throw new Error(`User with ID ${id} not found`);
    }
    this.users.delete(id);
  }
}
