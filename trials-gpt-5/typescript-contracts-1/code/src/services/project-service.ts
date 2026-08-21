import { randomUUID } from "node:crypto";
import { IProjectService, Project } from "../types";

export class ProjectService implements IProjectService {
  // Exclusive in-memory store
  private projects: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const id = randomUUID();
    const project: Project = { id, name: input.name, description: input.description, memberIds: [] };
    this.projects.set(id, project);
    return project;
  }

  getById(id: string): Project {
    const proj = this.projects.get(id);
    if (!proj) throw new Error("Project not found");
    return proj;
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  update(id: string, input: Partial<{ name: string; description: string }>): Project {
    const existing = this.projects.get(id);
    if (!existing) throw new Error("Project not found");
    const updated: Project = { ...existing, ...input } as Project;
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.projects.has(id)) throw new Error("Project not found");
    this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const proj = this.getById(projectId);
    if (!proj.memberIds.includes(userId)) {
      proj.memberIds.push(userId);
      this.projects.set(projectId, proj);
    }
    return proj;
  }

  removeMember(projectId: string, userId: string): Project {
    const proj = this.getById(projectId);
    proj.memberIds = proj.memberIds.filter((id) => id !== userId);
    this.projects.set(projectId, proj);
    return proj;
  }
}
