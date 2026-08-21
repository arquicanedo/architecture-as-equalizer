/**
 * Project Service - Manages projects
 */

import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  members: string[]; // User IDs
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  /**
   * Create a new project
   */
  createProject(name: string, description: string): Project {
    const project: Project = {
      id: randomUUID(),
      name,
      description,
      members: [],
    };
    this.projects.set(project.id, project);
    return project;
  }

  /**
   * Get a project by ID
   */
  getProject(id: string): Project | null {
    return this.projects.get(id) || null;
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
  updateProject(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    const updated: Project = {
      ...project,
      ...updates,
      id: project.id, // Ensure ID doesn't change
    };
    this.projects.set(id, updated);
    return updated;
  }

  /**
   * Delete a project
   */
  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  /**
   * Add a member to a project
   */
  addMember(projectId: string, userId: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.members.includes(userId)) {
      project.members.push(userId);
    }
    return project;
  }

  /**
   * Remove a member from a project
   */
  removeMember(projectId: string, userId: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    project.members = project.members.filter((id) => id !== userId);
    return project;
  }
}
