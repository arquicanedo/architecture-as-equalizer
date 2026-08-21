import { randomUUID } from 'crypto';

export type Project = {
  id: string;
  name: string;
  description?: string;
  members: string[]; // user IDs
};

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  createProject(name: string, description?: string): Project {
    const id = randomUUID();
    const p: Project = { id, name, description, members: [] };
    this.projects.set(id, p);
    return p;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  updateProject(id: string, data: Partial<Omit<Project, 'id' | 'members'>>): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): boolean {
    const p = this.projects.get(projectId);
    if (!p) return false;
    if (!p.members.includes(userId)) p.members.push(userId);
    return true;
  }

  removeMember(projectId: string, userId: string): boolean {
    const p = this.projects.get(projectId);
    if (!p) return false;
    p.members = p.members.filter((m) => m !== userId);
    return true;
  }

  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }
}
