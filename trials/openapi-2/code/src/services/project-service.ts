import { randomUUID } from "crypto";

// ── Domain types ────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class ProjectService {
  /** Owned data store — no other service may access this. */
  private store: Map<string, Project> = new Map();

  listAll(): Project[] {
    return Array.from(this.store.values());
  }

  getById(id: string): Project | undefined {
    return this.store.get(id);
  }

  create(input: CreateProjectInput): Project {
    if (!input.name || input.name.trim() === "") {
      throw new Error("Project name is required.");
    }
    if (input.description === undefined || input.description === null) {
      throw new Error("Project description is required.");
    }

    const project: Project = {
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description,
      memberIds: [],
    };

    this.store.set(project.id, project);
    return project;
  }

  update(id: string, input: UpdateProjectInput): Project | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: Project = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    };

    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    if (project.memberIds.includes(userId)) {
      // Already a member — idempotent, return current state
      return project;
    }

    const updated: Project = {
      ...project,
      memberIds: [...project.memberIds, userId],
    };

    this.store.set(projectId, updated);
    return updated;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((id) => id !== userId),
    };

    this.store.set(projectId, updated);
    return updated;
  }
}
