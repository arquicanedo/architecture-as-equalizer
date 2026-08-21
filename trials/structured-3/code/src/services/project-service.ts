/**
 * Project Service
 * Owns the project data store. Performs CRUD operations and manages membership.
 * Publishes no events. Subscribes to no events.
 */

import { randomUUID } from "crypto";

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
  private store: Map<string, Project> = new Map();

  create(input: CreateProjectInput): Project {
    if (!input.name) {
      throw new Error("name is required");
    }
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? "",
      memberIds: input.memberIds ? [...input.memberIds] : [],
    };
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.store.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: UpdateProjectInput): Project {
    const existing = this.getById(id);
    const updated: Project = {
      ...existing,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Project not found: ${id}`);
    }
    this.store.delete(id);
  }

  addMember(id: string, userId: string): Project {
    const project = this.getById(id);
    if (project.memberIds.includes(userId)) {
      return project; // already a member, idempotent
    }
    const updated: Project = {
      ...project,
      memberIds: [...project.memberIds, userId],
    };
    this.store.set(id, updated);
    return updated;
  }

  removeMember(id: string, userId: string): Project {
    const project = this.getById(id);
    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((mid) => mid !== userId),
    };
    this.store.set(id, updated);
    return updated;
  }
}
