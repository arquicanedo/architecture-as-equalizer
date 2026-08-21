import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export class ProjectService {
  private store: Map<string, Project> = new Map();

  create(input: Omit<Project, 'id' | 'memberIds'> & { memberIds?: string[] }): Project {
    const id = randomUUID();
    const project: Project = { id, name: input.name, description: input.description, memberIds: input.memberIds || [] };
    this.store.set(id, project);
    return project;
  }

  getById(id: string): Project | undefined {
    return this.store.get(id);
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<Omit<Project, 'id'>>): Project | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...input, id, memberIds: input.memberIds ?? existing.memberIds };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;
    if (!project.memberIds.includes(userId)) {
      project.memberIds = [...project.memberIds, userId];
      this.store.set(projectId, project);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    this.store.set(projectId, project);
    return project;
  }
}
