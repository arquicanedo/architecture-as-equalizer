import { randomBytes } from 'crypto';
import { EventBus } from './event-bus';

export interface Project {
    id: string;
    name: string;
    description: string;
    members: string[]; // User IDs
}

export class ProjectService {
    private projects: Map<string, Project> = new Map();

    constructor(private eventBus: EventBus) {}

    createProject(name: string, description: string, ownerId: string): Project {
        const id = randomBytes(16).toString('hex');
        const project: Project = { id, name, description, members: [ownerId] };
        this.projects.set(id, project);
        return project;
    }

    getProject(id: string): Project | undefined {
        return this.projects.get(id);
    }

    getAllProjects(): Project[] {
        return Array.from(this.projects.values());
    }

    updateProject(id: string, name: string, description: string): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        project.name = name;
        project.description = description;
        this.projects.set(id, project);
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
        if (!project.members.includes(userId)) {
            project.members.push(userId);
        }
        this.projects.set(projectId, project);
        this.eventBus.publish('project.member.added', { projectId, userId });
        return project;
    }

    removeMemberFromProject(projectId: string, userId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }
        project.members = project.members.filter(memberId => memberId !== userId);
        this.projects.set(projectId, project);
        this.eventBus.publish('project.member.removed', { projectId, userId });
        return project;
    }
}
