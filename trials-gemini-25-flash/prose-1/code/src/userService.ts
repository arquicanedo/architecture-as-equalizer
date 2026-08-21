import { User } from './types';

export class UserService {
  private users: Map<string, User> = new Map();

  constructor() {
    // Seed some initial data
    this.createUser({ id: 'user1', name: 'Alice Smith', email: 'alice@example.com' });
    this.createUser({ id: 'user2', name: 'Bob Johnson', email: 'bob@example.com' });
  }

  public createUser(user: User): User {
    if (this.users.has(user.id)) {
      throw new Error(`User with ID ${user.id} already exists.`);
    }
    this.users.set(user.id, user);
    return user;
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public updateUser(id: string, updates: Partial<Omit<User, 'id'>>): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found.`);
    }
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  public deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
