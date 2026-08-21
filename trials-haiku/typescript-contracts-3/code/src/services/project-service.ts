// ============================================================
// Project Service
// ============================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface IProjectService {
  create(input: { name: string; description: string }): Project;
  getById(id: string): Project;
  getAll(): Project[];
  update(id: string, input: Partial<{ name: string; description: string }>): Project;
  delete(id: string): void;
  addMember(projectId: string, userId: string): Project;
  removeMember(projectId: string, userId: string): Project;
}

export class ProjectService implements IProjectService {
  private projects: Map<string, Project> = new Map();
  private nextId = 1;

  create(input: { name: string; description: string }): Project {
    const id = `project-${this.nextId++}`;
    const project: Project = {
      id,
      name: input.name,
      description: input.description,
      memberIds: [],
    };
    this.projects.set(id, project);
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
      throw new Error(`Project not found: ${id}`);
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
    project.memberIds = project.memberIds.filter((id) => id !== userId);
    this.projects.set(projectId, project);
    return project;
  }
}
