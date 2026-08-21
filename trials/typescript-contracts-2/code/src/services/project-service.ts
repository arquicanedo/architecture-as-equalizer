import { randomUUID } from "crypto";
import { IProjectService, Project } from "../types.js";

export class ProjectService implements IProjectService {
  private store: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.store.set(project.id, project);
    return this.clone(project);
  }

  getById(id: string): Project {
    const project = this.store.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }
    return this.clone(project);
  }

  getAll(): Project[] {
    return Array.from(this.store.values()).map((p) => this.clone(p));
  }

  update(id: string, input: Partial<{ name: string; description: string }>): Project {
    const project = this.store.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }
    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined) project.description = input.description;
    this.store.set(id, project);
    return this.clone(project);
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Project not found: ${id}`);
    }
    this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.store.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    this.store.set(projectId, project);
    return this.clone(project);
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.store.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, project);
    return this.clone(project);
  }

  private clone(project: Project): Project {
    return { ...project, memberIds: [...project.memberIds] };
  }
}
