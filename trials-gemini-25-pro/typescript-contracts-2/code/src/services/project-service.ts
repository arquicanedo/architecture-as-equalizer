import * as crypto from 'crypto';
import { Project, IProjectService } from '../contracts';

export class ProjectService implements IProjectService {
    private readonly projects = new Map<string, Project>();

    create(input: { name: string; description: string }): Project {
        const id = crypto.randomUUID();
        const project: Project = {
            id,
            ...input,
            memberIds: [],
        };
        this.projects.set(id, project);
        return project;
    }

    getById(id: string): Project | undefined {
        return this.projects.get(id);
    }

    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    update(id: string, input: Partial<{ name: string; description: string }>): Project {
        const project = this.getById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }

        const updatedProject = { ...project, ...input };
        this.projects.set(id, updatedProject);
        return updatedProject;
    }

    delete(id: string): void {
        if (!this.projects.has(id)) {
            throw new Error(`Project with id ${id} not found`);
        }
        this.projects.delete(id);
    }

    addMember(projectId: string, userId: string): Project {
        const project = this.getById(projectId);
        if (!project) {
            throw new Error(`Project with id ${projectId} not found`);
        }

        if (!project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
        }

        return project;
    }

    removeMember(projectId: string, userId: string): Project {
        const project = this.getById(projectId);
        if (!project) {
            throw new Error(`Project with id ${projectId} not found`);
        }

        project.memberIds = project.memberIds.filter((id) => id !== userId);
        return project;
    }
}
