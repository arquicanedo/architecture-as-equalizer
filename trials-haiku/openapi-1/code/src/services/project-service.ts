/**
 * Project Service
 * Manages project data and operations.
 */

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

class ProjectService {
  private store: Map<string, Project> = new Map();

  /**
   * Get all projects.
   */
  getAllProjects(): Project[] {
    return Array.from(this.store.values());
  }

  /**
   * Get a project by ID.
   */
  getProjectById(id: string): Project | undefined {
    return this.store.get(id);
  }

  /**
   * Create a new project.
   */
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

  /**
   * Update a project.
   * Returns the updated project or undefined if not found.
   */
  updateProject(id: string, input: UpdateProjectInput): Project | undefined {
    const project = this.store.get(id);
    if (!project) return undefined;

    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined) project.description = input.description;

    this.store.set(id, project);
    return project;
  }

  /**
   * Delete a project.
   * Returns true if deleted, false if not found.
   */
  deleteProject(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Add a member to a project.
   * Returns the updated project or undefined if not found.
   */
  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.store.set(projectId, project);
    }
    return project;
  }

  /**
   * Remove a member from a project.
   * Returns the updated project or undefined if not found.
   */
  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.store.get(projectId);
    if (!project) return undefined;

    project.memberIds = project.memberIds.filter(id => id !== userId);
    this.store.set(projectId, project);
    return project;
  }
}

export const projectService = new ProjectService();
