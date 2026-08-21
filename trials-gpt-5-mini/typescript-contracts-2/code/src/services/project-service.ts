import { IProjectService, Project } from "../types";

const genId = (): string => {
  if (typeof (globalThis as any).crypto?.randomUUID === "function") return (globalThis as any).crypto.randomUUID();
  return "p-" + Math.random().toString(36).slice(2, 10);
};

export class ProjectService implements IProjectService {
  private store: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const id = genId();
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
    const updated = { ...p, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.delete(id)) throw new Error("Project not found");
  }

  addMember(projectId: string, userId: string): Project {
    const p = this.getById(projectId);
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    this.store.set(projectId, p);
    return p;
  }

  removeMember(projectId: string, userId: string): Project {
    const p = this.getById(projectId);
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, p);
    return p;
  }
}
