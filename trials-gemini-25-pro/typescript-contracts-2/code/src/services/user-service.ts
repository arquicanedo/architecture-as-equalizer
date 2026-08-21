import * as crypto from 'crypto';
import { User, IUserService } from '../contracts';

export class UserService implements IUserService {
  private readonly users = new Map<string, User>();

  create(input: { name: string; email: string }): User {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      ...input,
    };
    this.users.set(id, user);
    return user;
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, input: Partial<{ name: string; email: string }>): User {
    const user = this.getById(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser = { ...user, ...input };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  delete(id: string): void {
    if (!this.users.has(id)) {
      throw new Error(`User with id ${id} not found`);
    }
    this.users.delete(id);
  }
}
