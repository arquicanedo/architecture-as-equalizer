/**
 * Project Service - Manages projects and their members
 */

import { userService } from './user-service';

export interface Project {
  id: string;
  name: string;
  description: string;
  members: string[]; // User IDs
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();
  private nextId = 1;

  /**
   * Create a new project
   */
  createProject(name: string, description: string): Project {
    const id = `project-${this.nextId++}`;
    const project: Project = { id, name, description, members: [] };
    this.projects.set(id, project);
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

    if (updates.name !== undefined) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;

    return project;
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

    // Verify the user exists
    if (!userService.userExists(userId)) return null;

    // Don't add duplicate members
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

  /**
   * Check if a project exists
   */
  projectExists(id: string): boolean {
    return this.projects.has(id);
  }
}

export const projectService = new ProjectService();
