import { User, IUserService } from '../types';
import * as crypto from 'node:crypto';

export class UserService implements IUserService {
  private users: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = crypto.randomUUID();
    const newUser: User = { id, ...input };
    this.users.set(id, newUser);
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
    const updatedUser = { ...user, ...input };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  delete(id: string): void {
    if (!this.users.delete(id)) {
      throw new Error(`User with ID ${id} not found`);
    }
  }
}
