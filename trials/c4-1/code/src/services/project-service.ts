/**
 * Project Service — manages projects and membership.
 * Owns its own in-memory store. Publishes no events. Subscribes to no events.
 */

import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project not found: ${id}`);
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ProjectService {
  /** Service-owned store — no other service may access this directly. */
  private store: Map<string, Project> = new Map();

  create(data: { name: string; description: string }): Project {
    if (!data.name?.trim()) {
      throw new ProjectValidationError("name is required");
    }

    const project: Project = {
      id: randomUUID(),
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      memberIds: [],
    };

    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.store.get(id);
    if (!project) throw new ProjectNotFoundError(id);
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(
    id: string,
    data: Partial<{ name: string; description: string }>
  ): Project {
    const project = this.getById(id);

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new ProjectValidationError("name cannot be blank");
      project.name = data.name.trim();
    }
    if (data.description !== undefined) {
      project.description = data.description.trim();
    }

    this.store.set(id, project);
    return project;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new ProjectNotFoundError(id);
    this.store.delete(id);
  }

  addMember(id: string, userId: string): Project {
    if (!userId?.trim()) {
      throw new ProjectValidationError("userId is required");
    }
    const project = this.getById(id);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.store.set(id, project);
    }
    return project;
  }

  removeMember(id: string, userId: string): Project {
    if (!userId?.trim()) {
      throw new ProjectValidationError("userId is required");
    }
    const project = this.getById(id);
    project.memberIds = project.memberIds.filter((mid) => mid !== userId);
    this.store.set(id, project);
    return project;
  }
}

/** Singleton instance exported for use in the router. */
export const projectService = new ProjectService();
