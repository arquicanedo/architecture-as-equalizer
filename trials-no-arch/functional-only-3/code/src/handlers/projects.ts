import { projects, users, newId } from "../store.js";
import type {
  RouteHandler,
  CreateProjectBody,
  UpdateProjectBody,
  AddMemberBody,
} from "../types.js";

// ─── GET /projects ────────────────────────────────────────────────────────────

export const listProjects: RouteHandler = async (_req) => {
  return { status: 200, body: Array.from(projects.values()) };
};

// ─── POST /projects ───────────────────────────────────────────────────────────

export const createProject: RouteHandler = async (req) => {
  const data = req.body as CreateProjectBody;

  if (!data || typeof data.name !== "string" || !data.name.trim()) {
    return { status: 400, body: { error: "name is required" } };
  }
  if (typeof data.description !== "string") {
    return { status: 400, body: { error: "description is required" } };
  }

  const project = {
    id: newId(),
    name: data.name.trim(),
    description: data.description.trim(),
    memberIds: [],
  };
  projects.set(project.id, project);
  return { status: 201, body: project };
};

// ─── GET /projects/:id ────────────────────────────────────────────────────────

export const getProject: RouteHandler = async (req) => {
  const project = projects.get(req.query["id"]);
  if (!project) return { status: 404, body: { error: "Project not found" } };
  return { status: 200, body: project };
};

// ─── PUT /projects/:id ────────────────────────────────────────────────────────

export const updateProject: RouteHandler = async (req) => {
  const project = projects.get(req.query["id"]);
  if (!project) return { status: 404, body: { error: "Project not found" } };

  const data = req.body as UpdateProjectBody;
  if (!data) return { status: 400, body: { error: "Request body is required" } };

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return { status: 400, body: { error: "name must be a non-empty string" } };
    }
    project.name = data.name.trim();
  }

  if (data.description !== undefined) {
    if (typeof data.description !== "string") {
      return { status: 400, body: { error: "description must be a string" } };
    }
    project.description = data.description.trim();
  }

  projects.set(project.id, project);
  return { status: 200, body: project };
};

// ─── DELETE /projects/:id ─────────────────────────────────────────────────────

export const deleteProject: RouteHandler = async (req) => {
  const id = req.query["id"];
  if (!projects.has(id)) return { status: 404, body: { error: "Project not found" } };
  projects.delete(id);
  return { status: 200, body: { message: "Project deleted" } };
};

// ─── POST /projects/:id/members ───────────────────────────────────────────────

export const addMember: RouteHandler = async (req) => {
  const project = projects.get(req.query["id"]);
  if (!project) return { status: 404, body: { error: "Project not found" } };

  const data = req.body as AddMemberBody;
  if (!data || typeof data.userId !== "string" || !data.userId.trim()) {
    return { status: 400, body: { error: "userId is required" } };
  }

  const userId = data.userId.trim();
  if (!users.has(userId)) {
    return { status: 404, body: { error: "User not found" } };
  }

  if (project.memberIds.includes(userId)) {
    return { status: 409, body: { error: "User is already a member of this project" } };
  }

  project.memberIds.push(userId);
  projects.set(project.id, project);
  return { status: 200, body: project };
};

// ─── DELETE /projects/:id/members ─────────────────────────────────────────────

export const removeMember: RouteHandler = async (req) => {
  const project = projects.get(req.query["id"]);
  if (!project) return { status: 404, body: { error: "Project not found" } };

  const data = req.body as AddMemberBody;
  if (!data || typeof data.userId !== "string" || !data.userId.trim()) {
    return { status: 400, body: { error: "userId is required" } };
  }

  const userId = data.userId.trim();
  const idx = project.memberIds.indexOf(userId);
  if (idx === -1) {
    return { status: 404, body: { error: "User is not a member of this project" } };
  }

  project.memberIds.splice(idx, 1);
  projects.set(project.id, project);
  return { status: 200, body: project };
};
