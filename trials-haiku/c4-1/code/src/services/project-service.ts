/**
 * Project Service - Manages projects and membership
 */

import { randomUUID } from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface CreateProjectRequest {
  name: string;
  description: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface AddMemberRequest {
  userId: string;
}

export interface RemoveMemberRequest {
  userId: string;
}

export class ProjectService {
  private projectStore: Map<string, Project> = new Map();

  /**
   * Create a new project
   */
  create(req: CreateProjectRequest): Project {
    const project: Project = {
      id: randomUUID(),
      name: req.name,
      description: req.description,
      memberIds: [],
    };
    this.projectStore.set(project.id, project);
    return project;
  }

  /**
   * Get a project by ID
   */
  getById(id: string): Project | undefined {
    return this.projectStore.get(id);
  }

  /**
   * Get all projects
   */
  getAll(): Project[] {
    return Array.from(this.projectStore.values());
  }

  /**
   * Update a project
   */
  update(id: string, req: UpdateProjectRequest): Project | undefined {
    const project = this.projectStore.get(id);
    if (!project) {
      return undefined;
    }
    if (req.name !== undefined) {
      project.name = req.name;
    }
    if (req.description !== undefined) {
      project.description = req.description;
    }
    return project;
  }

  /**
   * Delete a project
   */
  delete(id: string): boolean {
    return this.projectStore.delete(id);
  }

  /**
   * Add a member to a project
   */
  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projectStore.get(projectId);
    if (!project) {
      return undefined;
    }
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  /**
   * Remove a member from a project
   */
  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projectStore.get(projectId);
    if (!project) {
      return undefined;
    }
    project.memberIds = project.memberIds.filter(id => id !== userId);
    return project;
  }
}

export const projectService = new ProjectService();
