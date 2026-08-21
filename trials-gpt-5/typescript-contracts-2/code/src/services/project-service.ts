import { IProjectService, Project } from "../types";
import { randomUUID } from "crypto";

export class ProjectService implements IProjectService {
  // RULE 2: exclusive data ownership
  private projects: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const id = randomUUID();
    const project: Project = { id, name: input.name, description: input.description, memberIds: [] };
    this.projects.set(id, project);
    return project;
  }

  getById(id: string): Project {
    const p = this.projects.get(id);
    if (!p) throw new Error("Project not found");
    return p;
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  update(id: string, input: Partial<{ name: string; description: string }>): Project {
    const p = this.projects.get(id);
    if (!p) throw new Error("Project not found");
    const updated: Project = { ...p, ...input };
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.projects.delete(id)) {
      throw new Error("Project not found");
    }
  }

  addMember(projectId: string, userId: string): Project {
    const p = this.getById(projectId);
    if (!p.memberIds.includes(userId)) {
      p.memberIds.push(userId);
      this.projects.set(projectId, { ...p });
    }
    return this.getById(projectId);
  }

  removeMember(projectId: string, userId: string): Project {
    const p = this.getById(projectId);
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    this.projects.set(projectId, { ...p });
    return this.getById(projectId);
  }
}
