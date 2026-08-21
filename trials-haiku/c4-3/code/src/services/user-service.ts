/**
 * User Service
 * Manages user CRUD operations
 */

import { randomUUID } from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService {
  private userStore: Map<string, User> = new Map();

  create(req: CreateUserRequest): User {
    const user: User = {
      id: randomUUID(),
      name: req.name,
      email: req.email,
    };
    this.userStore.set(user.id, user);
    return user;
  }

  getById(id: string): User | null {
    return this.userStore.get(id) || null;
  }

  getAll(): User[] {
    return Array.from(this.userStore.values());
  }

  update(id: string, req: UpdateUserRequest): User | null {
    const user = this.userStore.get(id);
    if (!user) return null;

    if (req.name !== undefined) {
      user.name = req.name;
    }
    if (req.email !== undefined) {
      user.email = req.email;
    }

    this.userStore.set(id, user);
    return user;
  }

  delete(id: string): boolean {
    return this.userStore.delete(id);
  }
}

export const userService = new UserService();
