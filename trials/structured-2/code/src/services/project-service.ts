/**
 * Project Service
 * Owns the project data store exclusively.
 * Data shape: { id, name, description, memberIds[] }
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

  create(data: { name: string; description: string }): Project {
    if (!data.name) throw new Error("name is required");
    const project: Project = {
      id: randomUUID(),
      name: data.name,
      description: data.description ?? "",
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
    data: Partial<{ name: string; description: string }>
  ): Project {
    const project = this.getById(id);
    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    this.store.set(id, project);
    return project;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`Project not found: ${id}`);
    this.store.delete(id);
  }

  addMember(id: string, userId: string): Project {
    const project = this.getById(id);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.store.set(id, project);
    }
    return project;
  }

  removeMember(id: string, userId: string): Project {
    const project = this.getById(id);
    project.memberIds = project.memberIds.filter((mid) => mid !== userId);
    this.store.set(id, project);
    return project;
  }
}
