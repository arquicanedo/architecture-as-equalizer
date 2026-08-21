import { IProjectService, Project } from "../types";
import { randomUUID } from "crypto";

export class ProjectService implements IProjectService {
  private store: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const id = randomUUID();
    const project: Project = { id, name: input.name, description: input.description, memberIds: [] };
    this.store.set(id, project);
    return project;
  }

  getById(id: string): Project {
    const p = this.store.get(id);
    if (!p) throw new Error("Project not found");
    return p;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<{ name: string; description: string }>): Project {
    const p = this.getById(id);
    const updated: Project = { ...p, ...input } as Project;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error("Project not found");
    this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const p = this.getById(projectId);
    if (!p.memberIds.includes(userId)) {
      p.memberIds.push(userId);
      this.store.set(projectId, p);
    }
    return p;
  }

  removeMember(projectId: string, userId: string): Project {
    const p = this.getById(projectId);
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, p);
    return p;
  }
}
