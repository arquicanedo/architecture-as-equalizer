import crypto from "crypto";

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export type CreateProjectInput = Omit<Project, "id" | "memberIds">;
export type UpdateProjectInput = Partial<Omit<Project, "id" | "memberIds">>;

export class ProjectService {
  private readonly projects: Map<string, Project> = new Map();

  findAll(): Project[] {
    return Array.from(this.projects.values());
  }

  findById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  create(input: CreateProjectInput): Project {
    const id = crypto.randomUUID();
    const project: Project = { ...input, id, memberIds: [] };
    this.projects.set(id, project);
    return project;
  }

  update(id: string, input: UpdateProjectInput): Project | undefined {
    const project = this.projects.get(id);
    if (!project) {
      return undefined;
    }
    const updatedProject = { ...project, ...input };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) {
      return undefined;
    }
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    this.projects.set(projectId, project);
    return project;
  }

  removeMember(projectId: string, userId: string): Project | undefined {
    const project = this.projects.get(projectId);
    if (!project) {
      return undefined;
    }
    project.memberIds = project.memberIds.filter(id => id !== userId);
    this.projects.set(projectId, project);
    return project;
  }
}
