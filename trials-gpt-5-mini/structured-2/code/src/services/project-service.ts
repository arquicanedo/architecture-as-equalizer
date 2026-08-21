export type Project = { id: string; name: string; description?: string; memberIds: string[] };

export class ProjectService {
  private store: Map<string, Project> = new Map();

  create(project: Project): Project {
    if (this.store.has(project.id)) throw new Error('Project exists');
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project | undefined {
    return this.store.get(id);
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<Project>): Project {
    const existing = this.store.get(id);
    if (!existing) throw new Error('Not found');
    const updated = { ...existing, ...patch };
    if (!updated.memberIds) updated.memberIds = existing.memberIds;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  addMember(projectId: string, memberId: string): Project {
    const project = this.store.get(projectId);
    if (!project) throw new Error('Not found');
    if (!project.memberIds.includes(memberId)) project.memberIds.push(memberId);
    return project;
  }

  removeMember(projectId: string, memberId: string): Project {
    const project = this.store.get(projectId);
    if (!project) throw new Error('Not found');
    project.memberIds = project.memberIds.filter((m) => m !== memberId);
    return project;
  }
}
