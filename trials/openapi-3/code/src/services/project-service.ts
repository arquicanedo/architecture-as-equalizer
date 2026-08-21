import { randomUUID } from 'crypto';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types.js';

// ─── Project Service ──────────────────────────────────────────────────────────
// Owns the project store exclusively. No other service may read/write this store.

class ProjectService {
  private store: Map<string, Project> = new Map();

  listProjects(): Project[] {
    return Array.from(this.store.values());
  }

  getProject(id: string): Project | undefined {
    return this.store.get(id);
  }

  createProject(input: CreateProjectInput): Project {
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.store.set(project.id, project);
    return project;
  }

  updateProject(id: string, input: UpdateProjectInput): Project | undefined {
    const project = this.store.get(id);
    if (!project) return undefined;

    const updated: Project = {
      ...project,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    };
    this.store.set(id, updated);
    return updated;
  }

  deleteProject(id: string): boolean {
    return this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    if (project.memberIds.includes(userId)) {
      // Idempotent: already a member
      return project;
    }

    const updated: Project = {
      ...project,
      memberIds: [...project.memberIds, userId],
    };
    this.store.set(projectId, updated);
    return updated;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((id) => id !== userId),
    };
    this.store.set(projectId, updated);
    return updated;
  }
}

export const projectService = new ProjectService();
