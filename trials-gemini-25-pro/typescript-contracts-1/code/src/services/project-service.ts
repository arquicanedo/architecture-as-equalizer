import { randomUUID } from "crypto";
import { Project, IProjectService } from "../types";

export class ProjectService implements IProjectService {
  private projects = new Map<string, Project>();

  create(input: { name: string; description: string }): Project {
    const id = randomUUID();
    const project: Project = {
      id,
      ...input,
      memberIds: [],
    };
    this.projects.set(id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
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
    if (!this.projects.has(id)) {
      throw new Error(`Project with id ${id} not found`);
    }
    this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (project.memberIds.includes(userId)) {
        return project;
    }
    project.memberIds.push(userId);
    this.projects.set(projectId, project);
    return project;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    const memberIndex = project.memberIds.indexOf(userId);
    if (memberIndex === -1) {
        throw new Error(`User ${userId} is not a member of project ${projectId}`);
    }
    project.memberIds.splice(memberIndex, 1);
    this.projects.set(projectId, project);
    return project;
  }
}
