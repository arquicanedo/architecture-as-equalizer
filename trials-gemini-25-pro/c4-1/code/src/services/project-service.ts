import { randomUUID } from 'crypto';

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

class ProjectService {
    private projectStore: Map<string, Project> = new Map();

    create(name: string, description: string, ownerId: string): Project {
        const id = randomUUID();
        const project: Project = {
            id,
            name,
            description,
            memberIds: [ownerId]
        };
        this.projectStore.set(id, project);
        return project;
    }

    getById(id: string): Project | undefined {
        return this.projectStore.get(id);
    }

    getAll(): Project[] {
        return Array.from(this.projectStore.values());
    }

    update(id: string, name: string, description: string): Project | undefined {
        const project = this.projectStore.get(id);
        if (project) {
            project.name = name;
            project.description = description;
            return project;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.projectStore.delete(id);
    }

    addMember(id: string, memberId: string): Project | undefined {
        const project = this.projectStore.get(id);
        if (project && !project.memberIds.includes(memberId)) {
            project.memberIds.push(memberId);
            return project;
        }
        return undefined;
    }

    removeMember(id: string, memberId: string): Project | undefined {
        const project = this.projectStore.get(id);
        if (project) {
            project.memberIds = project.memberIds.filter(id => id !== memberId);
            return project;
        }
        return undefined;
    }
}

export const projectService = new ProjectService();
