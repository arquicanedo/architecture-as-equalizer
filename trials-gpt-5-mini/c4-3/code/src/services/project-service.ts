import { Project, UUID } from '../types';
import { uuid } from '../utils';

export class ProjectService {
  private store: Map<UUID, Project> = new Map();

  create(payload: { name: string; description?: string; memberIds?: string[] }): Project {
    const id = uuid();
    const p: Project = { id, name: payload.name, description: payload.description ?? '', memberIds: payload.memberIds ?? [] };
    this.store.set(id, p);
    return p;
  }

  getById(id: UUID): Project | null {
    return this.store.get(id) ?? null;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: UUID, payload: { name?: string; description?: string }): Project | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Project = { ...existing, ...payload };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: UUID): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: UUID, userId: UUID): Project | null {
    const p = this.store.get(projectId);
    if (!p) return null;
    if (!p.memberIds.includes(userId)) p.memberIds.push(userId);
    return p;
  }

  removeMember(projectId: UUID, userId: UUID): Project | null {
    const p = this.store.get(projectId);
    if (!p) return null;
    p.memberIds = p.memberIds.filter(id => id !== userId);
    this.store.set(projectId, p);
    return p;
  }
}
