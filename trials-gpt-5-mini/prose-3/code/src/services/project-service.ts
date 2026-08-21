export type Project = {
  id: string;
  name: string;
  description?: string;
  members: string[]; // user ids
};

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  create(data: Omit<Project, 'id' | 'members'> & { id?: string; members?: string[] }): Project {
    const id = data.id ?? this.generateId();
    const project: Project = { id, name: data.name, description: data.description ?? '', members: data.members ?? [] };
    this.projects.set(id, project);
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  getById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  update(id: string, data: Partial<Omit<Project, 'id'>>): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...data };
    // ensure members array exists
    updated.members = updated.members ?? [];
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const p = this.projects.get(projectId);
    if (!p) return undefined;
    if (!p.members.includes(userId)) p.members.push(userId);
    return p;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const p = this.projects.get(projectId);
    if (!p) return undefined;
    p.members = p.members.filter((m) => m !== userId);
    this.projects.set(projectId, p);
    return p;
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
