import { Project, CreateProjectInput, UpdateProjectInput } from '../types';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class ProjectService {
  private store: Map<string, Project> = new Map();

  list(): Project[] {
    return Array.from(this.store.values());
  }

  create(input: CreateProjectInput): Project {
    const id = genId();
    const p: Project = { id, name: input.name, description: input.description, memberIds: [] };
    this.store.set(id, p);
    return p;
  }

  get(id: string): Project | null {
    return this.store.get(id) || null;
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...input };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project | null {
    const p = this.store.get(projectId);
    if (!p) return null;
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    this.store.set(projectId, p);
    return p;
  }

  removeMember(projectId: string, userId: string): Project | null {
    const p = this.store.get(projectId);
    if (!p) return null;
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, p);
    return p;
  }
}
