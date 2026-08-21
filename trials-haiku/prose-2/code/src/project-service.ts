/**
 * Project Service - manages projects and their members
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  members: string[]; // user IDs
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();
  private nextId: number = 1;

  /**
   * Create a new project
   */
  createProject(name: string, description: string, creatorId?: string): Project {
    const id = `project-${this.nextId++}`;
    const members = creatorId ? [creatorId] : [];
    const project: Project = { id, name, description, members };
    this.projects.set(id, project);
    return project;
  }

  /**
   * Get a project by ID
   */
  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Update a project
   */
  updateProject(projectId: string, name?: string, description?: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;

    this.projects.set(projectId, project);
    return project;
  }

  /**
   * Delete a project
   */
  deleteProject(projectId: string): boolean {
    return this.projects.delete(projectId);
  }

  /**
   * Add a member to a project
   */
  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    if (!project.members.includes(userId)) {
      project.members.push(userId);
      this.projects.set(projectId, project);
    }

    return project;
  }

  /**
   * Remove a member from a project
   */
  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    project.members = project.members.filter(id => id !== userId);
    this.projects.set(projectId, project);

    return project;
  }

  /**
   * Check if a project exists
   */
  projectExists(projectId: string): boolean {
    return this.projects.has(projectId);
  }
}

export const projectService = new ProjectService();
