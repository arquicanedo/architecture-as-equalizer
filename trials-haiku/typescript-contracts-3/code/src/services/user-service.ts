// ============================================================
// User Service
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface IUserService {
  create(input: { name: string; email: string }): User;
  getById(id: string): User;
  getAll(): User[];
  update(id: string, input: Partial<{ name: string; email: string }>): User;
  delete(id: string): void;
}

export class UserService implements IUserService {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  create(input: { name: string; email: string }): User {
    const id = `user-${this.nextId++}`;
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
    this.users.set(id, user);
    return user;
  }

  delete(id: string): void {
    if (!this.users.has(id)) {
      throw new Error(`User not found: ${id}`);
    }
    this.users.delete(id);
  }
}
