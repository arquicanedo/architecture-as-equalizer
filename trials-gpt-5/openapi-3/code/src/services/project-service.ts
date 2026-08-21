import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  createProject(input: CreateProjectInput): Project {
    const project: Project = { id: randomUUID(), name: input.name, description: input.description, memberIds: [] };
    this.projects.set(project.id, project);
    return project;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  updateProject(id: string, input: UpdateProjectInput): Project | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: Project = { ...existing, ...input };
    this.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    if (!project.memberIds.includes(userId)) {
      project.memberIds = [...project.memberIds, userId];
      this.projects.set(projectId, project);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    project.memberIds = project.memberIds.filter(id => id !== userId);
    this.projects.set(projectId, project);
    return project;
  }
}
