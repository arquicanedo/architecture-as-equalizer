export type Project = { id: string; name: string; description?: string; memberIds: string[] };

export class ProjectService {
  private store: Map<string, Project> = new Map();

  create(project: Project) {
    if (this.store.has(project.id)) throw new Error('Project exists');
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string) {
    return this.store.get(id) ?? null;
  }

  getAll() {
    return Array.from(this.store.values());
  }

  update(id: string, patch: Partial<Project>) {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    // ensure memberIds exists
    if (!updated.memberIds) updated.memberIds = existing.memberIds || [];
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string) {
    return this.store.delete(id);
  }

  addMember(projectId: string, userId: string) {
    const p = this.store.get(projectId);
    if (!p) return null;
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    return p;
  }

  removeMember(projectId: string, userId: string) {
    const p = this.store.get(projectId);
    if (!p) return null;
    p.memberIds = p.memberIds.filter((id) => id !== userId);
    return p;
  }
}
