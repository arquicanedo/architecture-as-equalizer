import { Project, CreateProjectInput, UpdateProjectInput } from '../models';
import { randomUUID } from 'crypto';

export class ProjectService {
    private projects: Map<string, Project> = new Map();

    public async listProjects(): Promise<Project[]> {
        return Array.from(this.projects.values());
    }

    public async getProject(id: string): Promise<Project | undefined> {
        return this.projects.get(id);
    }

    public async createProject(input: CreateProjectInput): Promise<Project> {
        const newProject: Project = {
            id: randomUUID(),
            name: input.name,
            description: input.description,
            memberIds: [],
        };
        this.projects.set(newProject.id, newProject);
        return newProject;
    }

    public async updateProject(id: string, input: UpdateProjectInput): Promise<Project | undefined> {
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

    public async deleteProject(id: string): Promise<boolean> {
        return this.projects.delete(id);
    }

    public async addMemberToProject(projectId: string, userId: string): Promise<Project | undefined> {
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

    public async removeMemberFromProject(projectId: string, userId: string): Promise<Project | undefined> {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }
        project.memberIds = project.memberIds.filter(memberId => memberId !== userId);
        this.projects.set(projectId, project);
        return project;
    }
}
