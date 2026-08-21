import { Project, ID } from '../types';

export class ProjectService {
  private store: Map<ID, Project> = new Map();

  list(): Project[] {
    return Array.from(this.store.values());
  }

  create(input: { name: string; description: string }): Project {
    const id = Math.random().toString(36).slice(2, 9);
    const project: Project = { id, memberIds: [], ...input } as Project;
    this.store.set(id, project);
    return project;
  }

  get(id: ID): Project | null {
    return this.store.get(id) ?? null;
  }

  update(id: ID, input: { name?: string; description?: string }): Project | null {
    const p = this.store.get(id);
    if (!p) return null;
    const updated = { ...p, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: ID): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: ID, userId: ID): Project | null {
    const p = this.store.get(projectId);
    if (!p) return null;
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    this.store.set(projectId, p);
    return p;
  }

  removeMember(projectId: ID, userId: ID): Project | null {
    const p = this.store.get(projectId);
    if (!p) return null;
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, p);
    return p;
  }
}

export const projectService = new ProjectService();
