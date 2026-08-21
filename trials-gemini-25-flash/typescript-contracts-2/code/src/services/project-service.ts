import { Project, IProjectService } from '../types';
import * as crypto from 'node:crypto';

export class ProjectService implements IProjectService {
  private projects = new Map<string, Project>();

  constructor() {
    // Seed with some initial data for demo/testing
    const project1: Project = { id: crypto.randomUUID(), name: 'Website Redesign', description: 'Redesign the company website', memberIds: [] };
    const project2: Project = { id: crypto.randomUUID(), name: 'Mobile App Dev', description: 'Develop new mobile application', memberIds: [] };
    this.projects.set(project1.id, project1);
    this.projects.set(project2.id, project2);
  }

  create(input: { name: string; description: string }): Project {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.projects.set(newProject.id, newProject);
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
    if (input.name !== undefined) {
      project.name = input.name;
    }
    if (input.description !== undefined) {
      project.description = input.description;
    }
    this.projects.set(id, project);
    return project;
  }

  delete(id: string): void {
    if (!this.projects.has(id)) {
      throw new Error(`Project with ID ${id} not found`);
    }
    this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    this.projects.set(projectId, project);
    return project;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    project.memberIds = project.memberIds.filter(id => id !== userId);
    this.projects.set(projectId, project);
    return project;
  }
}
