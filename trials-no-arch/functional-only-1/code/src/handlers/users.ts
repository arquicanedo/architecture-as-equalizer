import * as store from '../store.js';
import {
  ok, created, noContent,
  badRequest, notFound, conflict,
  isNonEmptyString, isObject,
} from '../helpers.js';
import type { RouteContext, RouteResponse, CreateUserBody, UpdateUserBody } from '../types.js';

// ─── GET /users ───────────────────────────────────────────────────────────────

export function listUsers(_ctx: RouteContext): RouteResponse {
  return ok(Array.from(store.users.values()));
}

// ─── POST /users ──────────────────────────────────────────────────────────────

export function createUser(ctx: RouteContext): RouteResponse {
  const body = ctx.req.body;

  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { name, email } = body as unknown as CreateUserBody;

  if (!isNonEmptyString(name)) return badRequest('Field "name" is required and must be a non-empty string');
  if (!isNonEmptyString(email)) return badRequest('Field "email" is required and must be a non-empty string');

  // Enforce unique email
  for (const u of store.users.values()) {
    if (u.email === email) return conflict(`A user with email "${email}" already exists`);
  }

  const user = {
    id: store.newId(),
    name: name.trim(),
    email: email.trim(),
    createdAt: store.now(),
    updatedAt: store.now(),
  };

  store.users.set(user.id, user);
  return created(user);
}

// ─── GET /users/:id ───────────────────────────────────────────────────────────

export function getUser(ctx: RouteContext): RouteResponse {
  const user = store.users.get(ctx.params.id);
  if (!user) return notFound(`User "${ctx.params.id}" not found`);
  return ok(user);
}

// ─── PUT /users/:id ───────────────────────────────────────────────────────────

export function updateUser(ctx: RouteContext): RouteResponse {
  const user = store.users.get(ctx.params.id);
  if (!user) return notFound(`User "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { name, email } = body as unknown as UpdateUserBody;

  if (name !== undefined && !isNonEmptyString(name)) {
    return badRequest('Field "name" must be a non-empty string');
  }
  if (email !== undefined && !isNonEmptyString(email)) {
    return badRequest('Field "email" must be a non-empty string');
  }

  // Enforce unique email if changing it
  if (email && email !== user.email) {
    for (const u of store.users.values()) {
      if (u.email === email) return conflict(`A user with email "${email}" already exists`);
    }
  }

  const updated = {
    ...user,
    ...(name ? { name: name.trim() } : {}),
    ...(email ? { email: email.trim() } : {}),
    updatedAt: store.now(),
  };

  store.users.set(user.id, updated);
  return ok(updated);
}

// ─── DELETE /users/:id ────────────────────────────────────────────────────────

export function deleteUser(ctx: RouteContext): RouteResponse {
  if (!store.users.has(ctx.params.id)) return notFound(`User "${ctx.params.id}" not found`);
  store.users.delete(ctx.params.id);
  return noContent();
}
