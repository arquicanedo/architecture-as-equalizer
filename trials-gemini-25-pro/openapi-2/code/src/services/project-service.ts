import crypto from 'crypto';

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
    private projects: Map<string, Project> = new Map();

    createProject(input: CreateProjectInput): Project {
        const id = crypto.randomUUID();
        const project: Project = { id, ...input, memberIds: [] };
        this.projects.set(id, project);
        return project;
    }

    getProject(id: string): Project | undefined {
        return this.projects.get(id);
    }

    listProjects(): Project[] {
        return Array.from(this.projects.values());
    }

    updateProject(id: string, input: UpdateProjectInput): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        const updatedProject = { ...project, ...input };
        this.projects.set(id, updatedProject);
        return updatedProject;
    }

    deleteProject(id: string): boolean {
        return this.projects.delete(id);
    }

    addMemberToProject(id: string, userId: string): Project | undefined {
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

    removeMemberFromProject(id: string, userId: string): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        project.memberIds = project.memberIds.filter(memberId => memberId !== userId);
        this.projects.set(id, project);
        return project;
    }
}
