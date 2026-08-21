export interface Project {
  id: string;
  name: string;
  description?: string;
  members: string[]; // user IDs
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  list(): Project[] {
    return Array.from(this.projects.values());
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  create(input: { name: string; description?: string; members?: string[] }): Project {
    const id = this.generateId();
    const project: Project = {
      id,
      name: input.name,
      description: input.description,
      members: input.members ? Array.from(new Set(input.members)) : [],
    };
    this.projects.set(id, project);
    return project;
  }

  update(id: string, input: Partial<Omit<Project, 'id'>>): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = {
      ...existing,
      ...input,
      id,
      members: input.members ? Array.from(new Set(input.members)) : existing.members,
    };
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    if (!project.members.includes(userId)) project.members.push(userId);
    return project;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    project.members = project.members.filter((m) => m !== userId);
    return project;
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
