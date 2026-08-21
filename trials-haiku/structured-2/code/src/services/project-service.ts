/**
 * Project Service - Manages projects and their members
 * Data ownership: Project records (id, name, description, memberIds)
 * No events published or subscribed
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();
  private nextId = 1;

  /**
   * Create a new project
   */
  create(name: string, description: string): Project {
    const id = `proj_${this.nextId++}`;
    const project: Project = {
      id,
      name,
      description,
      memberIds: [],
    };
    this.projects.set(id, project);
    return project;
  }

  /**
   * Get project by ID
   */
  getById(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  /**
   * Get all projects
   */
  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * Update project
   */
  update(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    // Don't allow updating memberIds directly; use addMember/removeMember
    const updated = {
      ...project,
      name: updates.name ?? project.name,
      description: updates.description ?? project.description,
    };
    this.projects.set(id, updated);
    return updated;
  }

  /**
   * Delete project
   */
  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  /**
   * Add a member to the project
   */
  addMember(projectId: string, userId: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  /**
   * Remove a member from the project
   */
  removeMember(projectId: string, userId: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    project.memberIds = project.memberIds.filter((id) => id !== userId);
    return project;
  }
}
