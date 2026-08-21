import { randomUUID } from 'crypto';

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

class ProjectService {
    private projects: Map<string, Project>;

    constructor() {
        this.projects = new Map();
    }

    /**
     * Creates a new project.
     * @param name The name of the project.
     * @param description The description of the project.
     * @returns The created project.
     */
    create(name: string, description: string): Project {
        if (!name) {
            throw new Error('Project name is required.');
        }
        const id = randomUUID();
        const newProject: Project = { id, name, description, memberIds: [] };
        this.projects.set(id, newProject);
        return newProject;
    }

    /**
     * Retrieves a project by its ID.
     * @param id The ID of the project.
     * @returns The project, or undefined if not found.
     */
    getById(id: string): Project | undefined {
        return this.projects.get(id);
    }

    /**
     * Retrieves all projects.
     * @returns An array of all projects.
     */
    getAll(): Project[] {
        return Array.from(this.projects.values());
    }

    /**
     * Updates an existing project.
     * @param id The ID of the project to update.
     * @param updates An object containing the fields to update (name, description).
     * @returns The updated project, or undefined if the project was not found.
     */
    update(id: string, updates: { name?: string; description?: string }): Project | undefined {
        const project = this.projects.get(id);
        if (project) {
            if (updates.name !== undefined) project.name = updates.name;
            if (updates.description !== undefined) project.description = updates.description;
            this.projects.set(id, project); 
            return project;
        }
        return undefined;
    }

    /**
     * Deletes a project by its ID.
     * @param id The ID of the project to delete.
     * @returns True if the project was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.projects.delete(id);
    }

    /**
     * Adds a member to a project.
     * @param projectId The ID of the project.
     * @param memberId The ID of the user to add as a member.
     * @returns The updated project, or undefined if the project was not found.
     */
    addMember(projectId: string, memberId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (project) {
            if (!project.memberIds.includes(memberId)) {
                project.memberIds.push(memberId);
                this.projects.set(projectId, project);
            }
            return project;
        }
        return undefined;
    }

    /**
     * Removes a member from a project.
     * @param projectId The ID of the project.
     * @param memberId The ID of the user to remove from members.
     * @returns The updated project, or undefined if the project was not found.
     */
    removeMember(projectId: string, memberId: string): Project | undefined {
        const project = this.projects.get(projectId);
        if (project) {
            const initialLength = project.memberIds.length;
            project.memberIds = project.memberIds.filter(id => id !== memberId);
            if (project.memberIds.length < initialLength) {
                this.projects.set(projectId, project);
            }
            return project;
        }
        return undefined;
    }
}

export const projectService = new ProjectService();
