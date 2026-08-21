import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export class ProjectService {
  private store: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const project: Project = { id: randomUUID(), name: input.name, description: input.description, memberIds: [] };
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project | undefined {
    return this.store.get(id);
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<Omit<Project, 'id' | 'memberIds'>>): Project | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...input, id };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  addMember(id: string, userId: string): Project | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    if (!existing.memberIds.includes(userId)) {
      existing.memberIds.push(userId);
      this.store.set(id, existing);
    }
    return existing;
  }

  removeMember(id: string, userId: string): Project | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    existing.memberIds = existing.memberIds.filter((m) => m !== userId);
    this.store.set(id, existing);
    return existing;
  }
}
