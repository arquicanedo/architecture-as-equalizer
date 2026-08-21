import crypto from "crypto";

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

export class ProjectService {
    private readonly projects: Map<string, Project> = new Map();

    create(name: string, description: string): Project {
        const id = crypto.randomUUID();
        const project: Project = { id, name, description, memberIds: [] };
        this.projects.set(id, project);
        return project;
    }

    getById(id: string): Project | undefined {
        return this.projects.get(id);
    }

    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    update(id: string, name: string, description: string): Project | undefined {
        const project = this.projects.get(id);
        if (project) {
            project.name = name;
            project.description = description;
            return project;
        }
        return undefined;
    }

    delete(id: string): boolean {
        return this.projects.delete(id);
    }

    addMember(id: string, memberId: string): Project | undefined {
        const project = this.projects.get(id);
        if (project && !project.memberIds.includes(memberId)) {
            project.memberIds.push(memberId);
            return project;
        }
        return undefined;
    }

    removeMember(id: string, memberId: string): Project | undefined {
        const project = this.projects.get(id);
        if (project) {
            const index = project.memberIds.indexOf(memberId);
            if (index > -1) {
                project.memberIds.splice(index, 1);
                return project;
            }
        }
        return undefined;
    }
}