import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export class ProjectService {
  private store: Map<string, Project> = new Map();

  list(): Project[] {
    return Array.from(this.store.values());
  }

  create(input: CreateProjectInput): Project {
    const id = randomUUID();
    const project: Project = { id, name: input.name, description: input.description, memberIds: [] };
    this.store.set(id, project);
    return project;
  }

  get(id: string): Project | null {
    return this.store.get(id) ?? null;
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const p = this.store.get(id);
    if (!p) return null;
    const updated: Project = { ...p, name: input.name ?? p.name, description: input.description ?? p.description };
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
