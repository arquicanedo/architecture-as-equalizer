import * as crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export type CreateUserInput = Omit<User, 'id'>;
export type UpdateUserInput = Partial<Omit<User, 'id'>>;

export class UserService {
  private readonly users: Map<string, User> = new Map();

  public createUser(input: CreateUserInput): User {
    const id = crypto.randomUUID();
    const user: User = { id, ...input };
    this.users.set(id, user);
    return user;
  }

  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  public listUsers(): User[] {
    return Array.from(this.users.values());
  }

  public updateUser(id: string, input: UpdateUserInput): User | undefined {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    const updatedUser = { ...user, ...input };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  public deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
