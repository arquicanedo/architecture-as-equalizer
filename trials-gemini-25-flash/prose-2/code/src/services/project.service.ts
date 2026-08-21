import { Project } from '../types';
import { randomUUID } from 'crypto';

export class ProjectService {
  private projects: Map<string, Project> = new Map();

  public createProject(name: string, description: string, initialMemberIds: string[] = []): Project {
    const newProject: Project = {
      id: randomUUID(),
      name,
      description,
      memberIds: [...new Set(initialMemberIds)], // Ensure unique members
    };
    this.projects.set(newProject.id, newProject);
    return newProject;
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  public updateProject(id: string, name?: string, description?: string): Project | undefined {
    const project = this.projects.get(id);
    if (project) {
      if (name !== undefined) project.name = name;
      if (description !== undefined) project.description = description;
      return project;
    }
    return undefined;
  }

  public addProjectMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (project && !project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      return project;
    }
    return undefined;
  }

  public removeProjectMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (project) {
      const initialLength = project.memberIds.length;
      project.memberIds = project.memberIds.filter(memberId => memberId !== userId);
      if (project.memberIds.length < initialLength) {
        return project;
      }
    }
    return undefined;
  }

  public deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }
}
