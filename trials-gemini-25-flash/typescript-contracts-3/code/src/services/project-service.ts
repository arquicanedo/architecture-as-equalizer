import { Project, IProjectService } from '../types';
import * as crypto from 'node:crypto';

export class ProjectService implements IProjectService {
  private projects: Map<string, Project> = new Map();

  create(input: { name: string; description: string }): Project {
    const id = crypto.randomUUID();
    const newProject: Project = { id, memberIds: [], ...input };
    this.projects.set(id, newProject);
    return newProject;
  }

  getById(id: string): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  update(id: string, input: Partial<{ name: string; description: string }>): Project {
    const project = this.getById(id);
    const updatedProject = { ...project, ...input };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  delete(id: string): void {
    if (!this.projects.delete(id)) {
      throw new Error(`Project with ID ${id} not found`);
    }
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.projects.set(projectId, project);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    const initialLength = project.memberIds.length;
    project.memberIds = project.memberIds.filter(id => id !== userId);
    if (project.memberIds.length === initialLength) {
        throw new Error(`User ${userId} is not a member of project ${projectId}`);
    }
    this.projects.set(projectId, project);
    return project;
  }
}
