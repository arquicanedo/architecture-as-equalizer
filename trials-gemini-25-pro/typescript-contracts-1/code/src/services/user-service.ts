import { randomUUID } from "crypto";
import { User, IUserService } from "../types";

export class UserService implements IUserService {
  private users = new Map<string, User>();

  create(input: { name: string; email: string }): User {
    const id = randomUUID();
    const user: User = {
      id,
      ...input,
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
