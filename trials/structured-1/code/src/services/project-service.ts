/**
 * Project Service — owns all project data.
 * Exposes plain TypeScript methods; no HTTP handling here.
 * Publishes no events and subscribes to none.
 */

import { randomUUID } from "crypto";
import { ApiError } from "../errors.js";

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export type CreateProjectInput = Omit<Project, "id" | "memberIds"> & {
  memberIds?: string[];
};
export type UpdateProjectInput = Partial<Omit<Project, "id" | "memberIds">>;

export class ProjectService {
  private readonly store = new Map<string, Project>();

  create(input: CreateProjectInput): Project {
    if (!input.name || !input.name.trim()) {
      throw new ApiError("name is required", 400);
    }
    const project: Project = {
      id: randomUUID(),
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      memberIds: input.memberIds ? [...input.memberIds] : [],
    };
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.store.get(id);
    if (!project) throw new ApiError(`Project not found: ${id}`, 404);
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: UpdateProjectInput): Project {
    const project = this.getById(id);
    const updated: Project = {
      ...project,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new ApiError(`Project not found: ${id}`, 404);
    this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (project.memberIds.includes(userId)) {
      throw new ApiError(
        `User ${userId} is already a member of project ${projectId}`,
        409
      );
    }
    const updated: Project = {
      ...project,
      memberIds: [...project.memberIds, userId],
    };
    this.store.set(projectId, updated);
    return updated;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (!project.memberIds.includes(userId)) {
      throw new ApiError(
        `User ${userId} is not a member of project ${projectId}`,
        400
      );
    }
    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((mid) => mid !== userId),
    };
    this.store.set(projectId, updated);
    return updated;
  }
}
