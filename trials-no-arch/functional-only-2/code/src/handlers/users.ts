import { ParsedRequest, ResponseHelper, User } from "../types";
import { store } from "../store";
import { generateId } from "../utils";

// GET /users
export function listUsers(_req: ParsedRequest, res: ResponseHelper): void {
  res.json(200, Array.from(store.users.values()));
}

// POST /users
export function createUser(req: ParsedRequest, res: ResponseHelper): void {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body.name !== "string" || typeof body.email !== "string") {
    res.error(400, "Fields 'name' and 'email' are required strings");
    return;
  }

  const name = body.name.trim();
  const email = body.email.trim();

  if (!name || !email) {
    res.error(400, "Fields 'name' and 'email' must not be empty");
    return;
  }

  // Email uniqueness check
  for (const user of store.users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      res.error(409, `A user with email '${email}' already exists`);
      return;
    }
  }

  const user: User = { id: generateId(), name, email };
  store.users.set(user.id, user);
  res.json(201, user);
}

// GET /users/:id
export function getUser(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const user = store.users.get(id);
  if (!user) {
    res.error(404, `User '${id}' not found`);
    return;
  }
  res.json(200, user);
}

// PUT /users/:id
export function updateUser(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const user = store.users.get(id);
  if (!user) {
    res.error(404, `User '${id}' not found`);
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body) {
    res.error(400, "Request body is required");
    return;
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      res.error(400, "Field 'name' must be a non-empty string");
      return;
    }
    user.name = body.name.trim();
  }

  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !body.email.trim()) {
      res.error(400, "Field 'email' must be a non-empty string");
      return;
    }
    const newEmail = body.email.trim();
    // Uniqueness check (exclude self)
    for (const u of store.users.values()) {
      if (u.id !== id && u.email.toLowerCase() === newEmail.toLowerCase()) {
        res.error(409, `A user with email '${newEmail}' already exists`);
        return;
      }
    }
    user.email = newEmail;
  }

  store.users.set(id, user);
  res.json(200, user);
}

// DELETE /users/:id
export function deleteUser(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  if (!store.users.has(id)) {
    res.error(404, `User '${id}' not found`);
    return;
  }
  store.users.delete(id);
  res.json(200, { message: `User '${id}' deleted` });
}
