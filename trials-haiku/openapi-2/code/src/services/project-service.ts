/**
 * Project Service
 * Manages project data and memberships. No other service may access this store.
 */

interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

class ProjectService {
  private store: Map<string, Project> = new Map();
  private nextId = 1;

  /**
   * Create a new project
   */
  create(name: string, description: string): Project {
    const id = `project-${this.nextId++}`;
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
   * Get project by ID
   */
  getById(id: string): Project | undefined {
    return this.store.get(id);
  }

  /**
   * Get all projects
   */
  listAll(): Project[] {
    return Array.from(this.store.values());
  }

  /**
   * Update project
   */
  update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'memberIds'>>
  ): Project | undefined {
    const project = this.store.get(id);
    if (!project) return undefined;

    const updated: Project = {
      ...project,
      ...updates,
    };
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete project
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Add member to project
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
   * Remove member from project
   */
  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    project.memberIds = project.memberIds.filter(id => id !== userId);
    return project;
  }
}

export const projectService = new ProjectService();
