/**
 * Project Service: Manages projects
 * Data: { id, name, description, memberIds[] }
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export class ProjectService {
  private store: Map<string, Project> = new Map();
  private idCounter = 0;

  /**
   * Create a new project
   */
  create(name: string, description: string): Project {
    const id = `p${++this.idCounter}`;
    const project: Project = {
      id,
      name,
      description,
      memberIds: [],
    };
    this.store.set(id, project);
    return project;
  }

  /**
   * Get a project by ID
   */
  getById(id: string): Project | undefined {
    return this.store.get(id);
  }

  /**
   * Get all projects
   */
  getAll(): Project[] {
    return Array.from(this.store.values());
  }

  /**
   * Update a project
   */
  update(
    id: string,
    updates: Partial<Omit<Project, 'id'>>
  ): Project | undefined {
    const project = this.store.get(id);
    if (!project) return undefined;

    const updated = { ...project, ...updates };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete a project
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Add a member to a project
   */
  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  /**
   * Remove a member from a project
   */
  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    project.memberIds = project.memberIds.filter(id => id !== userId);
    return project;
  }
}

export const projectService = new ProjectService();
