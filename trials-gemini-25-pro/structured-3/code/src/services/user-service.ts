import crypto from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private readonly users: Map<string, User> = new Map();

  create(name: string, email: string): User {
    const id = crypto.randomUUID();
    const user: User = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, name: string, email: string): User | undefined {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    user.name = name;
    user.email = email;
    return user;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
