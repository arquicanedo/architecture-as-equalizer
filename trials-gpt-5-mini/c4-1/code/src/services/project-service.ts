import { randomUUID } from 'crypto';

export type Project = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
};

export class ProjectService {
  private store: Map<string, Project> = new Map();

  create(data: { name: string; description?: string; memberIds?: string[] }): Project {
    const id = randomUUID();
    const project: Project = { id, name: data.name, description: data.description ?? '', memberIds: data.memberIds ?? [] };
    this.store.set(id, project);
    return project;
  }

  getById(id: string): Project | null {
    return this.store.get(id) ?? null;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, data: Partial<Omit<Project, 'id'>>): Project | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: string, userId: string): boolean {
    const p = this.store.get(projectId);
    if (!p) return false;
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    return true;
  }

  removeMember(projectId: string, userId: string): boolean {
    const p = this.store.get(projectId);
    if (!p) return false;
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    return true;
  }
}
