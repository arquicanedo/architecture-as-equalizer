import { Project, ProjectId, UserId } from './types';
import { EventBus } from './event-bus.js'; // Corrected import with .js extension
import { generateId } from './utils';

export class ProjectService {
  private projects: Map<ProjectId, Project> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    // Seed some initial data
    const project1 = this.createProject({ name: 'Website Redesign', description: 'Redesign the company website' });
    if (project1) {
      // Using a placeholder for user ID. In a real system, you'd create a user first.
      // For demo purposes, we assume 'user1' exists or will be created by the demo script.
      this.addMember(project1.id, 'user1'); 
    }
  }

  public createProject(projectData: { name: string; description: string }): Project {
    const newProject: Project = {
      id: generateId(),
      name: projectData.name,
      description: projectData.description,
      memberIds: [],
    };
    this.projects.set(newProject.id, newProject);
    return newProject;
  }

  public getProject(id: ProjectId): Project | undefined {
    return this.projects.get(id);
  }

  public getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  public updateProject(id: ProjectId, updates: Partial<Omit<Project, 'id'>>): Project | undefined {
    const project = this.projects.get(id);
    if (project) {
      Object.assign(project, updates);
      return project;
    }
    return undefined;
  }

  public deleteProject(id: ProjectId): boolean {
    return this.projects.delete(id);
  }

  public addMember(projectId: ProjectId, userId: UserId): Project | undefined {
    const project = this.projects.get(projectId);
    if (project && !project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
      this.eventBus.publish({ name: 'project.memberAdded', payload: { projectId, userId } });
      return project;
    }
    return undefined;
  }

  public removeMember(projectId: ProjectId, userId: UserId): Project | undefined {
    const project = this.projects.get(projectId);
    if (project) {
      const initialLength = project.memberIds.length;
      project.memberIds = project.memberIds.filter(id => id !== userId);
      if (project.memberIds.length < initialLength) {
        // Member was actually removed
        return project;
      }
    }
    return undefined;
  }
}
