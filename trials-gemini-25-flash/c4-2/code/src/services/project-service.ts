import { Project, UUID } from '../types';
import * as crypto from 'crypto';

function generateUUID(): UUID {
    return crypto.randomUUID();
}

export class ProjectService {
    private projects: Map<UUID, Project> = new Map();

    public create(name: string, description: string): Project {
        if (!name) {
            throw new Error('Project name is required.');
        }
        const newProject: Project = {
            id: generateUUID(),
            name,
            description,
            memberIds: [],
        };
        this.projects.set(newProject.id, newProject);
        return newProject;
    }

    public getById(id: UUID): Project | undefined {
        return this.projects.get(id);
    }

    public getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    public update(id: UUID, name?: string, description?: string): Project | undefined {
        const project = this.projects.get(id);
        if (project) {
            if (name !== undefined) project.name = name;
            if (description !== undefined) project.description = description;
            return { ...project };
        }
        return undefined;
    }

    public delete(id: UUID): boolean {
        return this.projects.delete(id);
    }

    public addMember(projectId: UUID, userId: UUID): Project | undefined {
        const project = this.projects.get(projectId);
        if (project) {
            if (!project.memberIds.includes(userId)) {
                project.memberIds.push(userId);
                return { ...project };
            }
        }
        return undefined;
    }

    public removeMember(projectId: UUID, userId: UUID): Project | undefined {
        const project = this.projects.get(projectId);
        if (project) {
            const initialLength = project.memberIds.length;
            project.memberIds = project.memberIds.filter(id => id !== userId);
            if (project.memberIds.length < initialLength) {
                return { ...project };
            }
        }
        return undefined;
    }
}
