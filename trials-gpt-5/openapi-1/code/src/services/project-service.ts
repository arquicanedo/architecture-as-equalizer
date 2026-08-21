import { randomUUID } from 'crypto';
import { CreateProjectInput, Project, UUID, UpdateProjectInput } from '../types';

export class ProjectService {
  private projects: Map<UUID, Project> = new Map();

  list(): Project[] {
    return Array.from(this.projects.values());
  }

  create(input: CreateProjectInput): Project {
    const project: Project = { id: randomUUID(), name: input.name, description: input.description, memberIds: [] };
    this.projects.set(project.id, project);
    return project;
  }

  get(id: UUID): Project | undefined {
    return this.projects.get(id);
  }

  update(id: UUID, input: UpdateProjectInput): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...input };
    this.projects.set(id, updated);
    return updated;
  }

  delete(id: UUID): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: UUID, userId: UUID): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  removeMember(projectId: UUID, userId: UUID): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    project.memberIds = project.memberIds.filter(id => id !== userId);
    return project;
  }
}
