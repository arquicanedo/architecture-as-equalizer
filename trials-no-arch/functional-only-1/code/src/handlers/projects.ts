import * as store from '../store.js';
import {
  ok, created, noContent,
  badRequest, notFound, conflict,
  isNonEmptyString, isObject,
} from '../helpers.js';
import type {
  RouteContext, RouteResponse,
  CreateProjectBody, UpdateProjectBody, AddMemberBody,
} from '../types.js';

// ─── GET /projects ────────────────────────────────────────────────────────────

export function listProjects(_ctx: RouteContext): RouteResponse {
  return ok(Array.from(store.projects.values()));
}

// ─── POST /projects ───────────────────────────────────────────────────────────

export function createProject(ctx: RouteContext): RouteResponse {
  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { name, description } = body as unknown as CreateProjectBody;
  if (!isNonEmptyString(name)) return badRequest('Field "name" is required and must be a non-empty string');

  const project = {
    id: store.newId(),
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    memberIds: [] as string[],
    createdAt: store.now(),
    updatedAt: store.now(),
  };

  store.projects.set(project.id, project);
  return created(project);
}

// ─── GET /projects/:id ───────────────────────────────────────────────────────

export function getProject(ctx: RouteContext): RouteResponse {
  const project = store.projects.get(ctx.params.id);
  if (!project) return notFound(`Project "${ctx.params.id}" not found`);
  return ok(project);
}

// ─── PUT /projects/:id ───────────────────────────────────────────────────────

export function updateProject(ctx: RouteContext): RouteResponse {
  const project = store.projects.get(ctx.params.id);
  if (!project) return notFound(`Project "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { name, description } = body as unknown as UpdateProjectBody;

  if (name !== undefined && !isNonEmptyString(name)) {
    return badRequest('Field "name" must be a non-empty string');
  }

  const updated = {
    ...project,
    ...(name ? { name: name.trim() } : {}),
    ...(description !== undefined ? { description: description.trim() } : {}),
    updatedAt: store.now(),
  };

  store.projects.set(project.id, updated);
  return ok(updated);
}

// ─── DELETE /projects/:id ────────────────────────────────────────────────────

export function deleteProject(ctx: RouteContext): RouteResponse {
  if (!store.projects.has(ctx.params.id)) return notFound(`Project "${ctx.params.id}" not found`);
  store.projects.delete(ctx.params.id);
  return noContent();
}

// ─── POST /projects/:id/members ──────────────────────────────────────────────

export function addMember(ctx: RouteContext): RouteResponse {
  const project = store.projects.get(ctx.params.id);
  if (!project) return notFound(`Project "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { userId } = body as unknown as AddMemberBody;
  if (!isNonEmptyString(userId)) return badRequest('Field "userId" is required and must be a non-empty string');

  if (!store.users.has(userId)) return notFound(`User "${userId}" not found`);
  if (project.memberIds.includes(userId)) return conflict(`User "${userId}" is already a member of this project`);

  const updated = { ...project, memberIds: [...project.memberIds, userId], updatedAt: store.now() };
  store.projects.set(project.id, updated);
  return ok(updated);
}

// ─── DELETE /projects/:id/members ────────────────────────────────────────────

export function removeMember(ctx: RouteContext): RouteResponse {
  const project = store.projects.get(ctx.params.id);
  if (!project) return notFound(`Project "${ctx.params.id}" not found`);

  const body = ctx.req.body;
  if (!isObject(body)) return badRequest('Request body must be a JSON object');

  const { userId } = body as unknown as AddMemberBody;
  if (!isNonEmptyString(userId)) return badRequest('Field "userId" is required and must be a non-empty string');

  if (!project.memberIds.includes(userId)) return notFound(`User "${userId}" is not a member of this project`);

  const updated = {
    ...project,
    memberIds: project.memberIds.filter(id => id !== userId),
    updatedAt: store.now(),
  };

  store.projects.set(project.id, updated);
  return ok(updated);
}
