/**
 * Project Service — manages projects and membership.
 * Owns its own in-memory data store (Map<string, Project>).
 * Publishes no events; subscribes to no events.
 */

import { randomUUID } from "crypto";

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export class ProjectService {
  private store: Map<string, Project> = new Map();

  create(name: string, description: string): Project {
    if (!name) throw new Error("name is required");
    const project: Project = {
      id: randomUUID(),
      name,
      description: description ?? "",
      memberIds: [],
    };
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.store.get(id);
    if (!project) throw new Error(`Project not found: ${id}`);
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(
    id: string,
    fields: Partial<Pick<Project, "name" | "description">>
  ): Project {
    const project = this.getById(id);
    if (fields.name !== undefined) project.name = fields.name;
    if (fields.description !== undefined) project.description = fields.description;
    this.store.set(id, project);
    return project;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`Project not found: ${id}`);
    this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.store.set(projectId, project);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, project);
    return project;
  }
}
