import { Project, ProjectMemberAddedEvent, ProjectMemberRemovedEvent } from './types';
import { EventBus } from './eventBus';
import { v4 as uuidv4 } from 'uuid'; // Using a placeholder for uuid generation

// Placeholder for UUID generation since we cannot use npm packages
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class ProjectService {
  private projects: Map<string, Project> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    // Seed some initial data
    this.createProject({ id: generateUuid(), name: 'Website Redesign', description: 'Redesign the company website', memberIds: new Set(['user1']) });
    this.createProject({ id: generateUuid(), name: 'Mobile App Dev', description: 'Develop new mobile application', memberIds: new Set(['user2']) });
  }

  public createProject(project: Omit<Project, 'id' | 'memberIds'> & { id?: string; memberIds?: Set<string> }): Project {
    const newProjectId = project.id || generateUuid();
    const newProject: Project = {
      id: newProjectId,
      name: project.name,
      description: project.description,
      memberIds: project.memberIds || new Set(),
    };
    if (this.projects.has(newProject.id)) {
      throw new Error(`Project with ID ${newProject.id} already exists.`);
    }
    this.projects.set(newProject.id, newProject);
    return newProject;
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  public updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'memberIds'>>): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found.`);
    }
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  public deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  public addMemberToProject(projectId: string, userId: string): Project {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    if (project.memberIds.has(userId)) {
      throw new Error(`User ${userId} is already a member of project ${projectId}.`);
    }
    project.memberIds.add(userId);
    this.eventBus.publish<ProjectMemberAddedEvent>('project.memberAdded', {
      projectId,
      userId,
      timestamp: Date.now(),
    });
    return project;
  }

  public removeMemberFromProject(projectId: string, userId: string): Project {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    if (!project.memberIds.has(userId)) {
      throw new Error(`User ${userId} is not a member of project ${projectId}.`);
    }
    project.memberIds.delete(userId);
    this.eventBus.publish<ProjectMemberRemovedEvent>('project.memberRemoved', {
      projectId,
      userId,
      timestamp: Date.now(),
    });
    return project;
  }

  public isProjectMember(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId);
    return project ? project.memberIds.has(userId) : false;
  }
}
