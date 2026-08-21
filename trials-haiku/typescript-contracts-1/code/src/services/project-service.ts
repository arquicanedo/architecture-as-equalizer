import { Project, IProjectService } from "../types";
import { randomBytes } from "crypto";

export class ProjectService implements IProjectService {
  private projects: Map<string, Project> = new Map();

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  create(input: { name: string; description: string }): Project {
    const project: Project = {
      id: this.generateId(),
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.projects.set(project.id, project);
    return project;
  }

  getById(id: string): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }
    return project;
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  update(
    id: string,
    input: Partial<{ name: string; description: string }>
  ): Project {
    const project = this.getById(id);
    if (input.name !== undefined) {
      project.name = input.name;
    }
    if (input.description !== undefined) {
      project.description = input.description;
    }
    return project;
  }

  delete(id: string): void {
    const project = this.getById(id);
    this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    if (!project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
    return project;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getById(projectId);
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    return project;
  }
}
