import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  members: string[]; // user IDs
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  create(name: string, description: string): Project {
    const project: Project = { id: randomUUID(), name, description, members: [] };
    this.projects.set(project.id, project);
    return project;
  }

  list(): Project[] {
    return Array.from(this.projects.values());
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  update(id: string, updates: Partial<Omit<Project, 'id' | 'members'>>): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...updates, id: existing.id, members: existing.members };
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    if (!project.members.includes(userId)) {
      project.members.push(userId);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    project.members = project.members.filter(m => m !== userId);
    return project;
  }
}
