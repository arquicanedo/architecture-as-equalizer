interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private users: Map<string, User> = new Map();
  private nextId: number = 1;

  create(name: string, email: string): User {
    const id = `user-${this.nextId++}`;
    const newUser: User = { id, name, email };
    this.users.set(id, newUser);
    return newUser;
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(id: string, name: string, email: string): User | undefined {
    const user = this.users.get(id);
    if (user) {
      user.name = name;
      user.email = email;
      return user;
    }
    return undefined;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}

export const userService = new UserService();
