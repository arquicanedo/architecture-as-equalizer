import { Project } from './types';
import { randomUUID } from 'crypto';

export class ProjectService {
    private projects: Map<string, Project> = new Map();

    createProject(name: string, description: string): Project {
        const id = randomUUID();
        const project: Project = { id, name, description, memberIds: [] };
        this.projects.set(id, project);
        return project;
    }

    getProject(id: string): Project | undefined {
        return this.projects.get(id);
    }

    getProjects(): Project[] {
        return Array.from(this.projects.values());
    }

    updateProject(id: string, name?: string, description?: string): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }

        if (name) {
            project.name = name;
        }
        if (description) {
            project.description = description;
        }
        return project;
    }

    deleteProject(id: string): boolean {
        return this.projects.delete(id);
    }

    addMemberToProject(projectId: string, userId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }
        if (!project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
        }
        return project;
    }

    removeMemberFromProject(projectId: string, userId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }
        project.memberIds = project.memberIds.filter(id => id !== userId);
        return project;
    }
}
