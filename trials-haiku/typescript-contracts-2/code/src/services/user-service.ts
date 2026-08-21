// ============================================================
// User Service Implementation
// ============================================================

import { User } from "../types.js";
import { randomUUID } from "crypto";

interface IUserService {
  create(input: { name: string; email: string }): User;
  getById(id: string): User;
  getAll(): User[];
  update(id: string, input: Partial<{ name: string; email: string }>): User;
  delete(id: string): void;
}

class UserService implements IUserService {
  private users: Map<string, User> = new Map();

  create(input: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = {
      id,
      name: input.name,
      email: input.email,
    };
    this.users.set(id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
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
    return user;
  }

  delete(id: string): void {
    const user = this.getById(id);
    this.users.delete(id);
  }
}

export { IUserService, UserService };
