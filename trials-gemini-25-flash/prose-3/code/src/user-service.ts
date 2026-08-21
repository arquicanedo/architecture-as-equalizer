import { User, UserId } from './types';
import { generateId } from './utils';

export class UserService {
  private users: Map<UserId, User> = new Map();

  constructor() {
    // Seed some initial data
    this.createUser({ name: 'Alice Smith', email: 'alice@example.com' });
    this.createUser({ name: 'Bob Johnson', email: 'bob@example.com' });
  }

  public createUser(userData: { name: string; email: string }): User {
    const newUser: User = {
      id: generateId(),
      name: userData.name,
      email: userData.email,
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  public getUser(id: UserId): User | undefined {
    return this.users.get(id);
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public updateUser(id: UserId, updates: Partial<Omit<User, 'id'>>): User | undefined {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates);
      return user;
    }
    return undefined;
  }

  public deleteUser(id: UserId): boolean {
    return this.users.delete(id);
  }
}
