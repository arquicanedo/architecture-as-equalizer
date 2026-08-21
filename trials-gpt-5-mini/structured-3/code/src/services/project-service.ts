export type Project = {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
};

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
    const updated = { ...existing, ...patch, id, memberIds: patch.memberIds ?? existing.memberIds };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const p = this.store.get(projectId);
    if (!p) throw new Error('Not found');
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    return p;
  }

  removeMember(projectId: string, userId: string): Project {
    const p = this.store.get(projectId);
    if (!p) throw new Error('Not found');
    p.memberIds = p.memberIds.filter((id) =&gt; id !== userId);
    return p;
  }
}
