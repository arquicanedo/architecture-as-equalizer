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
  private projects: Map<string, Project> = new Map();

  list(): Project[] {
    return Array.from(this.projects.values());
  }

  create(input: CreateProjectInput): Project {
    const id = randomUUID();
    const project: Project = { id, name: input.name, description: input.description, memberIds: [] };
    this.projects.set(id, project);
    return project;
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  update(id: string, input: UpdateProjectInput): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...input };
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const proj = this.projects.get(projectId);
    if (!proj) return undefined;
    if (!proj.memberIds.includes(userId)) {
      proj.memberIds.push(userId);
    }
    return proj;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const proj = this.projects.get(projectId);
    if (!proj) return undefined;
    proj.memberIds = proj.memberIds.filter(id => id !== userId);
    return proj;
  }
}
