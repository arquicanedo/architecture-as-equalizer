import { Project, UUID } from '../types';
import { randomUUID } from 'crypto';

class ProjectService {
    private projects: Map<UUID, Project>;

    constructor() {
        this.projects = new Map<UUID, Project>();
    }

    /**
     * Creates a new project.
     * @param name Project name.
     * @param description Project description.
     * @returns The newly created project.
     */
    create(name: string, description: string): Project {
        if (!name) {
            throw new Error("Project name is required.");
        }
        const id: UUID = randomUUID();
        const newProject: Project = { id, name, description, memberIds: [] };
        this.projects.set(id, newProject);
        return newProject;
    }

    /**
     * Retrieves a project by its ID.
     * @param id The project's UUID.
     * @returns The project, or undefined if not found.
     */
    getById(id: UUID): Project | undefined {
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
     * @param updates An object containing fields to update (name, description).
     * @returns The updated project, or undefined if the project was not found.
     */
    update(id: UUID, updates: { name?: string, description?: string }): Project | undefined {
        const project = this.projects.get(id);
        if (!project) {
            return undefined;
        }
        const updatedProject = { ...project, ...updates };
        this.projects.set(id, updatedProject);
        return updatedProject;
    }

    /**
     * Deletes a project by its ID.
     * @param id The ID of the project to delete.
     * @returns True if the project was deleted, false otherwise.
     */
    delete(id: UUID): boolean {
        return this.projects.delete(id);
    }

    /**
     * Adds a member to a project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to add as a member.
     * @returns The updated project, or undefined if the project was not found.
     */
    addMember(projectId: UUID, userId: UUID): Project | undefined {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }
        if (!project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
        }
        this.projects.set(projectId, project); // Ensure map is updated if project object was modified
        return project;
    }

    /**
     * Removes a member from a project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to remove from members.
     * @returns The updated project, or undefined if the project was not found.
     */
    removeMember(projectId: UUID, userId: UUID): Project | undefined {
        const project = this.projects.get(projectId);
        if (!project) {
            return undefined;
        }
        const initialLength = project.memberIds.length;
        project.memberIds = project.memberIds.filter(memberId => memberId !== userId);
        if (project.memberIds.length < initialLength) {
            this.projects.set(projectId, project); // Ensure map is updated if project object was modified
        }
        return project;
    }
}

export const projectService = new ProjectService();
