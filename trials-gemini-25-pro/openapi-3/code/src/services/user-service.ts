import crypto from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

export type CreateUserInput = Omit<User, "id">;
export type UpdateUserInput = Partial<Omit<User, "id">>;

export class UserService {
  private readonly users: Map<string, User> = new Map();

  findAll(): User[] {
    return Array.from(this.users.values());
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  create(input: CreateUserInput): User {
    const id = crypto.randomUUID();
    const user: User = { id, ...input };
    this.users.set(id, user);
    return user;
  }

  update(id: string, input: UpdateUserInput): User | undefined {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    const updatedUser = { ...user, ...input };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
