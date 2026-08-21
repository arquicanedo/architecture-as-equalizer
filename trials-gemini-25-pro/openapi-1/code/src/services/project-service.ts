import * as crypto from 'crypto';

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export type CreateProjectInput = Omit<Project, 'id' | 'memberIds'>;
export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'memberIds'>>;

export class ProjectService {
  private readonly projects: Map<string, Project> = new Map();

  public createProject(input: CreateProjectInput): Project {
    const id = crypto.randomUUID();
    const project: Project = { id, ...input, memberIds: [] };
    this.projects.set(id, project);
    return project;
  }

  public getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public listProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  public updateProject(id: string, input: UpdateProjectInput): Project | undefined {
    const project = this.projects.get(id);
    if (!project) {
      return undefined;
    }
    const updatedProject = { ...project, ...input };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  public deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  public addMemberToProject(id: string, userId: string): Project | undefined {
    const project = this.projects.get(id);
    if (!project) {
      return undefined;
    }
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    this.projects.set(id, project);
    return project;
  }

  public removeMemberFromProject(id: string, userId: string): Project | undefined {
      const project = this.projects.get(id);
      if (!project) {
        return undefined;
      }
      project.memberIds = project.memberIds.filter(memberId => memberId !== userId);
      this.projects.set(id, project);
      return project;
    }

}
