/**
 * Project Service
 * Manages projects and membership
 */

import { randomUUID } from "crypto";

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

export interface AddMemberInput {
  userId: string;
}

export interface RemoveMemberInput {
  userId: string;
}

export class ProjectService {
  private projectStore: Map<string, Project> = new Map();

  /**
   * Create a new project
   */
  create(input: CreateProjectInput): Project {
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.projectStore.set(project.id, project);
    return project;
  }

  /**
   * Get project by ID
   */
  getById(id: string): Project | null {
    return this.projectStore.get(id) || null;
  }

  /**
   * Get all projects
   */
  getAll(): Project[] {
    return Array.from(this.projectStore.values());
  }

  /**
   * Update project
   */
  update(id: string, input: UpdateProjectInput): Project | null {
    const project = this.projectStore.get(id);
    if (!project) return null;

    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined)
      project.description = input.description;

    this.projectStore.set(id, project);
    return project;
  }

  /**
   * Delete project
   */
  delete(id: string): boolean {
    return this.projectStore.delete(id);
  }

  /**
   * Add member to project
   */
  addMember(projectId: string, userId: string): Project | null {
    const project = this.projectStore.get(projectId);
    if (!project) return null;

    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.projectStore.set(projectId, project);
    }

    return project;
  }

  /**
   * Remove member from project
   */
  removeMember(projectId: string, userId: string): Project | null {
    const project = this.projectStore.get(projectId);
    if (!project) return null;

    project.memberIds = project.memberIds.filter((id) => id !== userId);
    this.projectStore.set(projectId, project);

    return project;
  }
}

export const projectService = new ProjectService();
