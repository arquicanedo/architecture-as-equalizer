import { randomUUID } from 'crypto';

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

export interface CreateProjectInput {
    name: string;
    description: string;
}

export interface UpdateProjectInput {
    name?: string;
    description?: string;
}

export class ProjectService {
    private projects: Map<string, Project>;

    constructor() {
        this.projects = new Map();
    }

    listProjects(): Project[] {
        return Array.from(this.projects.values());
    }

    getProject(id: string): Project | undefined {
        return this.projects.get(id);
    }

    createProject(input: CreateProjectInput): Project {
        const newProject: Project = {
            id: randomUUID(),
            name: input.name,
            description: input.description,
            memberIds: [],
        };
        this.projects.set(newProject.id, newProject);
        return newProject;
    }

    updateProject(id: string, input: UpdateProjectInput): Project | undefined {
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

    deleteProject(id: string): boolean {
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
