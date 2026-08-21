/**
 * Project Service
 * Manages projects and their members independently
 */

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
  private store: Map<string, Project> = new Map();
  private idCounter: number = 0;

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `project_${++this.idCounter}`;
  }

  /**
   * List all projects
   */
  listProjects(): Project[] {
    return Array.from(this.store.values());
  }

  /**
   * Get project by ID
   */
  getProject(id: string): Project | null {
    return this.store.get(id) || null;
  }

  /**
   * Create a new project
   */
  createProject(input: CreateProjectInput): Project {
    const project: Project = {
      id: this.generateId(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.store.set(project.id, project);
    return project;
  }

  /**
   * Update a project
   */
  updateProject(id: string, input: UpdateProjectInput): Project | null {
    const project = this.store.get(id);
    if (!project) return null;

    const updated: Project = {
      ...project,
      name: input.name ?? project.name,
      description: input.description ?? project.description,
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a project
   */
  deleteProject(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Add a member to a project
   */
  addMember(projectId: string, userId: string): Project | null {
    const project = this.store.get(projectId);
    if (!project) return null;

    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  /**
   * Remove a member from a project
   */
  removeMember(projectId: string, userId: string): Project | null {
    const project = this.store.get(projectId);
    if (!project) return null;

    project.memberIds = project.memberIds.filter(id => id !== userId);
    return project;
  }
}

export const projectService = new ProjectService();
