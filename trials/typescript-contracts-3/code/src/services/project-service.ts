// ============================================================
// Project Service — IProjectService implementation
// ============================================================

import { randomUUID } from "crypto";

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

interface IProjectService {
  create(input: { name: string; description: string }): Project;
  getById(id: string): Project;
  getAll(): Project[];
  update(id: string, input: Partial<{ name: string; description: string }>): Project;
  delete(id: string): void;
  addMember(projectId: string, userId: string): Project;
  removeMember(projectId: string, userId: string): Project;
}

class ProjectService implements IProjectService {
  private store: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.store.set(project.id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.store.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  update(id: string, input: Partial<{ name: string; description: string }>): Project {
    const project = this.getById(id);
    const updated: Project = {
      ...project,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Project not found: ${id}`);
    }
    this.store.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (project.memberIds.includes(userId)) {
      return project; // Already a member — idempotent
    }
    const updated: Project = {
      ...project,
      memberIds: [...project.memberIds, userId],
    };
    this.store.set(projectId, updated);
    return updated;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((id) => id !== userId),
    };
    this.store.set(projectId, updated);
    return updated;
  }
}

export const projectService = new ProjectService();
