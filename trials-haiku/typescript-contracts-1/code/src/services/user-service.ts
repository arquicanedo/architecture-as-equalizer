import { User, IUserService } from "../types";
import { randomBytes } from "crypto";

export class UserService implements IUserService {
  private users: Map<string, User> = new Map();

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  create(input: { name: string; email: string }): User {
    const user: User = {
      id: this.generateId(),
      name: input.name,
      email: input.email,
    };
    this.users.set(user.id, user);
    return user;
  }

  getById(id: string): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
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
