import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const id = randomUUID();
    const project: Project = {
      id,
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.projects.set(id, project);
    return project;
  }

  getById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  update(id: string, patch: Partial<Omit<Project, 'id' | 'memberIds'>>): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...patch, id };
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    return project;
  }
}
