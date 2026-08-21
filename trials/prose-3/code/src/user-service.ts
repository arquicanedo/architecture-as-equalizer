import { randomUUID } from 'crypto';
import { User, CreateUserDTO, UpdateUserDTO } from './types';

export class UserService {
  private users: Map<string, User> = new Map();

  /** Create a new user and return it. */
  createUser(dto: CreateUserDTO): User {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('User name is required.');
    }
    if (!dto.email || dto.email.trim() === '') {
      throw new Error('User email is required.');
    }
    // Enforce unique email
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === dto.email.toLowerCase()) {
        throw new Error(`Email "${dto.email}" is already in use.`);
      }
    }

    const user: User = {
      id: randomUUID(),
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
    };
    this.users.set(user.id, user);
    return user;
  }

  /** Return all users. */
  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  /** Return a single user by ID, or undefined if not found. */
  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  /** Update an existing user. Throws if not found. */
  updateUser(id: string, dto: UpdateUserDTO): User {
    const user = this.users.get(id);
    if (!user) throw new Error(`User "${id}" not found.`);

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      for (const u of this.users.values()) {
        if (u.id !== id && u.email === email) {
          throw new Error(`Email "${dto.email}" is already in use.`);
        }
      }
      user.email = email;
    }

    if (dto.name !== undefined) {
      if (dto.name.trim() === '') throw new Error('User name cannot be empty.');
      user.name = dto.name.trim();
    }

    return user;
  }

  /** Delete a user by ID. Throws if not found. */
  deleteUser(id: string): void {
    if (!this.users.has(id)) throw new Error(`User "${id}" not found.`);
    this.users.delete(id);
  }
}
