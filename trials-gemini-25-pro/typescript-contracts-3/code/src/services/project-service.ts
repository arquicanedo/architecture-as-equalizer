import { randomUUID } from 'crypto';
import { Project, IProjectService } from '../types';

export class ProjectService implements IProjectService {
    private projects: Map<string, Project> = new Map();
    // We would normally inject a UserService to validate users, but per RULE 1, we can't.
    // The router or a higher-level layer would be responsible for such validation.

    create(input: { name: string; description: string }): Project {
        const newProject: Project = {
            id: randomUUID(),
            name: input.name,
            description: input.description,
            memberIds: [],
        };
        this.projects.set(newProject.id, newProject);
        return newProject;
    }

    getById(id: string): Project {
        const project = this.projects.get(id);
        if (!project) {
            throw new Error('Project not found');
        }
        return project;
    }

    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    update(id: string, input: Partial<{ name: string; description: string }>): Project {
        const project = this.getById(id);
        if (input.name) {
            project.name = input.name;
        }
        if (input.description) {
            project.description = input.description;
        }
        this.projects.set(id, project);
        return project;
    }

    delete(id: string): void {
        if (!this.projects.delete(id)) {
            throw new Error('Project not found');
        }
    }

    addMember(projectId: string, userId: string): Project {
        const project = this.getById(projectId);
        if (!project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
        }
        return project;
    }

    removeMember(projectId: string, userId: string): Project {
        const project = this.getById(projectId);
        project.memberIds = project.memberIds.filter(id => id !== userId);
        return project;
    }
}
