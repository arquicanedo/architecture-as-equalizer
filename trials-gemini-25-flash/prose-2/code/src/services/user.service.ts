import { User } from '../types';
import { randomUUID } from 'crypto';

export class UserService {
  private users: Map<string, User> = new Map();

  constructor() {
    // Seed some initial data
    this.createUser('Alice Smith', 'alice@example.com');
    this.createUser('Bob Johnson', 'bob@example.com');
  }

  public createUser(name: string, email: string): User {
    const newUser: User = {
      id: randomUUID(),
      name,
      email,
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public updateUser(id: string, name?: string, email?: string): User | undefined {
    const user = this.users.get(id);
    if (user) {
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      return user;
    }
    return undefined;
  }

  public deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
