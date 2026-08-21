import { randomUUID } from 'crypto';

/**
 * @deprecated Use `src/types/project.ts` once type definitions are centralized
 */
export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[]; // Array of user IDs
}

/**
 * Manages projects and their membership.
 * Adheres to ADR-002: Service-Owned Data Stores.
 */
export class ProjectService {
    private projectStore: Map<string, Project>;

    constructor() {
        this.projectStore = new Map();
    }

    /**
     * Creates a new project.
     * @param name The name of the project.
     * @param description The description of the project.
     * @param initialMemberId Optional ID of a user to add as an initial member.
     * @returns The newly created project.
     */
    create(name: string, description: string, initialMemberId?: string): Project {
        const newProject: Project = {
            id: randomUUID(),
            name,
            description,
            memberIds: initialMemberId ? [initialMemberId] : [],
        };
        this.projectStore.set(newProject.id, newProject);
        return newProject;
    }

    /**
     * Retrieves a project by its ID.
     * @param id The ID of the project.
     * @returns The project, or undefined if not found.
     */
    getById(id: string): Project | undefined {
        return this.projectStore.get(id);
    }

    /**
     * Retrieves all projects.
     * @returns An array of all projects.
     */
    getAll(): Project[] {
        return Array.from(this.projectStore.values());
    }

    /**
     * Updates an existing project.
     * @param id The ID of the project to update.
     * @param updates An object containing the fields to update (name, description).
     * @returns The updated project, or undefined if not found.
     */
    update(id: string, updates: { name?: string; description?: string }): Project | undefined {
        const project = this.projectStore.get(id);
        if (!project) {
            return undefined;
        }

        if (updates.name !== undefined) {
            project.name = updates.name;
        }
        if (updates.description !== undefined) {
            project.description = updates.description;
        }

        this.projectStore.set(id, project); // Re-set to ensure map update
        return { ...project }; // Return a copy
    }

    /**
     * Deletes a project by its ID.
     * @param id The ID of the project to delete.
     * @returns True if the project was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.projectStore.delete(id);
    }

    /**
     * Adds a member to a project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to add as a member.
     * @returns The updated project, or undefined if project not found or user already a member.
     */
    addMember(projectId: string, userId: string): Project | undefined {
        const project = this.projectStore.get(projectId);
        if (!project) {
            return undefined; // Project not found
        }

        if (!project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
            this.projectStore.set(projectId, project);
            return { ...project };
        }
        return { ...project }; // User already a member, return current project state
    }

    /**
     * Removes a member from a project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to remove from members.
     * @returns The updated project, or undefined if project not found or user not a member.
     */
    removeMember(projectId: string, userId: string): Project | undefined {
        const project = this.projectStore.get(projectId);
        if (!project) {
            return undefined; // Project not found
        }

        const initialLength = project.memberIds.length;
        project.memberIds = project.memberIds.filter(id => id !== userId);

        if (project.memberIds.length < initialLength) {
            this.projectStore.set(projectId, project);
            return { ...project };
        }
        return { ...project }; // User not a member, return current project state
    }
}
