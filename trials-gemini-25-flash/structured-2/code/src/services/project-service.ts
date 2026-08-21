import { randomUUID } from 'crypto';

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

export class ProjectService {
    private projects: Map<string, Project>;

    constructor() {
        this.projects = new Map();
    }

    create(name: string, description: string): Project {
        const id = randomUUID();
        const newProject: Project = { id, name, description, memberIds: [] };
        this.projects.set(id, newProject);
        return newProject;
    }

    getById(id: string): Project | undefined {
        return this.projects.get(id);
    }

    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    update(id: string, name?: string, description?: string): Project | undefined {
        const project = this.projects.get(id);
        if (project) {
            if (name !== undefined) project.name = name;
            if (description !== undefined) project.description = description;
            this.projects.set(id, project); 
            return project;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.projects.delete(id);
    }

    addMember(projectId: string, userId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (project && !project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
            return { ...project }; // Return a copy to reflect change
        }
        return undefined;
    }

    removeMember(projectId: string, userId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (project) {
            const initialLength = project.memberIds.length;
            project.memberIds = project.memberIds.filter(id => id !== userId);
            if (project.memberIds.length < initialLength) {
                return { ...project }; // Return a copy to reflect change
            }
        }
        return undefined;
    }
}
