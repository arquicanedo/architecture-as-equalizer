import { users, newId } from "../store.js";
import type { RouteHandler, CreateUserBody, UpdateUserBody } from "../types.js";

// ─── GET /users ───────────────────────────────────────────────────────────────

export const listUsers: RouteHandler = async (_req) => {
  return { status: 200, body: Array.from(users.values()) };
};

// ─── POST /users ──────────────────────────────────────────────────────────────

export const createUser: RouteHandler = async (req) => {
  const data = req.body as CreateUserBody;

  if (!data || typeof data.name !== "string" || !data.name.trim()) {
    return { status: 400, body: { error: "name is required" } };
  }
  if (typeof data.email !== "string" || !data.email.trim()) {
    return { status: 400, body: { error: "email is required" } };
  }

  // Ensure email uniqueness
  const emailExists = Array.from(users.values()).some(
    (u) => u.email.toLowerCase() === data.email.toLowerCase()
  );
  if (emailExists) {
    return { status: 409, body: { error: "A user with that email already exists" } };
  }

  const user = { id: newId(), name: data.name.trim(), email: data.email.trim() };
  users.set(user.id, user);
  return { status: 201, body: user };
};

// ─── GET /users/:id ───────────────────────────────────────────────────────────

export const getUser: RouteHandler = async (req) => {
  const user = users.get(req.query["id"]);
  if (!user) return { status: 404, body: { error: "User not found" } };
  return { status: 200, body: user };
};

// ─── PUT /users/:id ───────────────────────────────────────────────────────────

export const updateUser: RouteHandler = async (req) => {
  const user = users.get(req.query["id"]);
  if (!user) return { status: 404, body: { error: "User not found" } };

  const data = req.body as UpdateUserBody;
  if (!data) return { status: 400, body: { error: "Request body is required" } };

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return { status: 400, body: { error: "name must be a non-empty string" } };
    }
    user.name = data.name.trim();
  }

  if (data.email !== undefined) {
    if (typeof data.email !== "string" || !data.email.trim()) {
      return { status: 400, body: { error: "email must be a non-empty string" } };
    }
    const emailExists = Array.from(users.values()).some(
      (u) => u.id !== user.id && u.email.toLowerCase() === data.email!.toLowerCase()
    );
    if (emailExists) {
      return { status: 409, body: { error: "A user with that email already exists" } };
    }
    user.email = data.email.trim();
  }

  users.set(user.id, user);
  return { status: 200, body: user };
};

// ─── DELETE /users/:id ────────────────────────────────────────────────────────

export const deleteUser: RouteHandler = async (req) => {
  const id = req.query["id"];
  if (!users.has(id)) return { status: 404, body: { error: "User not found" } };
  users.delete(id);
  return { status: 200, body: { message: "User deleted" } };
};
