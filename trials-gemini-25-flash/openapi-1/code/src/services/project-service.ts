
import { Project, CreateProjectInput, UpdateProjectInput, ProjectId, UserId } from '../types';
import * as crypto from 'crypto';

export class ProjectService {
    private projects: Map<ProjectId, Project>;

    constructor() {
        this.projects = new Map();
    }

    public async getAllProjects(): Promise<Project[]> {
        return Array.from(this.projects.values());
    }

    public async getProjectById(id: ProjectId): Promise<Project | undefined> {
        return this.projects.get(id);
    }

    public async createProject(input: CreateProjectInput): Promise<Project> {
        const newProject: Project = {
            id: crypto.randomUUID(),
            name: input.name,
            description: input.description,
            memberIds: [],
        };
        this.projects.set(newProject.id, newProject);
        return newProject;
    }

    public async updateProject(id: ProjectId, input: UpdateProjectInput): Promise<Project | undefined> {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }

        if (input.name !== undefined) {
            project.name = input.name;
        }
        if (input.description !== undefined) {
            project.description = input.description;
        }

        this.projects.set(id, project);
        return project;
    }

    public async deleteProject(id: ProjectId): Promise<boolean> {
        return this.projects.delete(id);
    }

    public async addMember(projectId: ProjectId, userId: UserId): Promise<Project | undefined> {
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

    public async removeMember(projectId: ProjectId, userId: UserId): Promise<Project | undefined> {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }

        const initialLength = project.memberIds.length;
        project.memberIds = project.memberIds.filter(id => id !== userId);

        if (project.memberIds.length < initialLength) {
            this.projects.set(projectId, project);
            return project;
        } else {
            // Member not found, return the existing project without changes
            return project;
        }
    }
}
