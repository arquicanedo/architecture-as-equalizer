import crypto from 'crypto';

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

export class ProjectService {
    private projects: Map<string, Project> = new Map();

    // Create
    create(data: { name: string; description: string }): Project {
        const id = crypto.randomUUID();
        const project: Project = { id, ...data, memberIds: [] };
        this.projects.set(id, project);
        return project;
    }

    // Get All
    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    // Get by ID
    getById(id: string): Project | undefined {
        return this.projects.get(id);
    }

    // Update
    update(id: string, data: Partial<Omit<Project, 'id' | 'memberIds'>>): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        const updatedProject = { ...project, ...data };
        this.projects.set(id, updatedProject);
        return updatedProject;
    }

    // Delete
    delete(id: string): boolean {
        return this.projects.delete(id);
    }

    // Add Member
    addMember(id: string, memberId: string): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        if (!project.memberIds.includes(memberId)) {
            project.memberIds.push(memberId);
        }
        return project;
    }

    // Remove Member
    removeMember(id: string, memberId: string): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        project.memberIds = project.memberIds.filter(mId => mId !== memberId);
        return project;
    }
}
