import { Project, ID } from '../types';
import { randomUUID } from 'crypto';

export class ProjectService {
  private projects: Map<ID, Project> = new Map();

  createProject(name: string, description?: string): Project {
    const id = randomUUID();
    const p: Project = { id, name, description, members: [] };
    this.projects.set(id, p);
    return p;
  }

  getProject(id: ID): Project | undefined {
    return this.projects.get(id);
  }

  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  updateProject(id: ID, data: Partial<Omit<Project, 'id' | 'members'>>) {
    const p = this.projects.get(id);
    if (!p) return undefined;
    const updated = { ...p, ...data } as Project;
    this.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: ID) {
    return this.projects.delete(id);
  }

  addMember(projectId: ID, userId: ID) {
    const p = this.projects.get(projectId);
    if (!p) return false;
    if (!p.members.includes(userId)) p.members.push(userId);
    return true;
  }

  removeMember(projectId: ID, userId: ID) {
    const p = this.projects.get(projectId);
    if (!p) return false;
    p.members = p.members.filter((m) => m !== userId);
    this.projects.set(projectId, p);
    return true;
  }
}
