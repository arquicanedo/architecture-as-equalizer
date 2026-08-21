import { ParsedRequest, ResponseHelper, Project } from "../types";
import { store } from "../store";
import { generateId } from "../utils";

// GET /projects
export function listProjects(_req: ParsedRequest, res: ResponseHelper): void {
  res.json(200, Array.from(store.projects.values()));
}

// POST /projects
export function createProject(req: ParsedRequest, res: ResponseHelper): void {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body.name !== "string") {
    res.error(400, "Field 'name' is required and must be a string");
    return;
  }

  const name = body.name.trim();
  if (!name) {
    res.error(400, "Field 'name' must not be empty");
    return;
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  const project: Project = {
    id: generateId(),
    name,
    description,
    memberIds: [],
  };

  store.projects.set(project.id, project);
  res.json(201, project);
}

// GET /projects/:id
export function getProject(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const project = store.projects.get(id);
  if (!project) {
    res.error(404, `Project '${id}' not found`);
    return;
  }
  res.json(200, project);
}

// PUT /projects/:id
export function updateProject(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const project = store.projects.get(id);
  if (!project) {
    res.error(404, `Project '${id}' not found`);
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
    project.name = body.name.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      res.error(400, "Field 'description' must be a string");
      return;
    }
    project.description = body.description.trim();
  }

  store.projects.set(id, project);
  res.json(200, project);
}

// DELETE /projects/:id
export function deleteProject(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  if (!store.projects.has(id)) {
    res.error(404, `Project '${id}' not found`);
    return;
  }
  store.projects.delete(id);

  // Cascade: remove tasks belonging to this project
  for (const [taskId, task] of store.tasks.entries()) {
    if (task.projectId === id) {
      store.tasks.delete(taskId);
      // Cascade: remove comments on deleted tasks
      for (const [commentId, comment] of store.comments.entries()) {
        if (comment.taskId === taskId) {
          store.comments.delete(commentId);
        }
      }
    }
  }

  res.json(200, { message: `Project '${id}' deleted` });
}

// POST /projects/:id/members  — body: { userId }
export function addMember(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const project = store.projects.get(id);
  if (!project) {
    res.error(404, `Project '${id}' not found`);
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body || typeof body.userId !== "string") {
    res.error(400, "Field 'userId' is required and must be a string");
    return;
  }

  const userId = body.userId.trim();
  if (!store.users.has(userId)) {
    res.error(404, `User '${userId}' not found`);
    return;
  }

  if (project.memberIds.includes(userId)) {
    res.error(409, `User '${userId}' is already a member of this project`);
    return;
  }

  project.memberIds.push(userId);
  store.projects.set(id, project);
  res.json(200, project);
}

// DELETE /projects/:id/members  — body: { userId }
export function removeMember(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const project = store.projects.get(id);
  if (!project) {
    res.error(404, `Project '${id}' not found`);
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body || typeof body.userId !== "string") {
    res.error(400, "Field 'userId' is required and must be a string");
    return;
  }

  const userId = body.userId.trim();
  const index = project.memberIds.indexOf(userId);
  if (index === -1) {
    res.error(404, `User '${userId}' is not a member of this project`);
    return;
  }

  project.memberIds.splice(index, 1);
  store.projects.set(id, project);
  res.json(200, project);
}
