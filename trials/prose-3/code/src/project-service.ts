import { randomUUID } from 'crypto';
import { Project, CreateProjectDTO, UpdateProjectDTO } from './types';

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  /** Create a new project and return it. */
  createProject(dto: CreateProjectDTO): Project {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Project name is required.');
    }

    const project: Project = {
      id: randomUUID(),
      name: dto.name.trim(),
      description: (dto.description ?? '').trim(),
      memberIds: [],
    };
    this.projects.set(project.id, project);
    return project;
  }

  /** Return all projects. */
  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /** Return a single project by ID, or undefined if not found. */
  getProjectById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /** Update an existing project. Throws if not found. */
  updateProject(id: string, dto: UpdateProjectDTO): Project {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project "${id}" not found.`);

    if (dto.name !== undefined) {
      if (dto.name.trim() === '') throw new Error('Project name cannot be empty.');
      project.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      project.description = dto.description.trim();
    }

    return project;
  }

  /** Delete a project by ID. Throws if not found. */
  deleteProject(id: string): void {
    if (!this.projects.has(id)) throw new Error(`Project "${id}" not found.`);
    this.projects.delete(id);
  }

  /** Add a member (by userId) to a project. Throws if project not found. */
  addMember(projectId: string, userId: string): Project {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project "${projectId}" not found.`);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  /** Remove a member (by userId) from a project. Throws if project not found. */
  removeMember(projectId: string, userId: string): Project {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project "${projectId}" not found.`);
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    return project;
  }
}
