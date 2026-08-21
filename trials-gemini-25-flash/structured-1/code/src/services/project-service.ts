interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

class ProjectService {
  private projects: Map<string, Project> = new Map();
  private nextId: number = 1;

  create(name: string, description: string, creatorId: string): Project {
    const id = `proj-${this.nextId++}`;
    const newProject: Project = { id, name, description, memberIds: [creatorId] };
    this.projects.set(id, newProject);
    return newProject;
  }

  getById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  update(id: string, name: string, description: string): Project | undefined {
    const project = this.projects.get(id);
    if (project) {
      project.name = name;
      project.description = description;
      return project;
    }
    return undefined;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  addMember(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId);
    if (project && !project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      return true;
    }
    return false;
  }

  removeMember(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId);
    if (project) {
      const initialLength = project.memberIds.length;
      project.memberIds = project.memberIds.filter(memberId => memberId !== userId);
      return project.memberIds.length < initialLength;
    }
    return false;
  }
}

export const projectService = new ProjectService();
