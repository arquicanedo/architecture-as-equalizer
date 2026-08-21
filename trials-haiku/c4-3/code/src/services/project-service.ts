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

  getById(id: string): Project | null {
    return this.projectStore.get(id) || null;
  }

  getAll(): Project[] {
    return Array.from(this.projectStore.values());
  }

  update(id: string, req: UpdateProjectRequest): Project | null {
    const project = this.projectStore.get(id);
    if (!project) return null;

    if (req.name !== undefined) {
      project.name = req.name;
    }
    if (req.description !== undefined) {
      project.description = req.description;
    }

    this.projectStore.set(id, project);
    return project;
  }

  delete(id: string): boolean {
    return this.projectStore.delete(id);
  }

  addMember(projectId: string, userId: string): Project | null {
    const project = this.projectStore.get(projectId);
    if (!project) return null;

    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.projectStore.set(projectId, project);
    }

    return project;
  }

  removeMember(projectId: string, userId: string): Project | null {
    const project = this.projectStore.get(projectId);
    if (!project) return null;

    project.memberIds = project.memberIds.filter((id) => id !== userId);
    this.projectStore.set(projectId, project);

    return project;
  }
}

export const projectService = new ProjectService();
