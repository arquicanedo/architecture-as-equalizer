import { randomUUID } from 'crypto';

export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

const projects = new Map<string, Project>();

export const projectService = {
    create: (data: { name: string; description: string; memberIds?: string[] }): Project => {
        const id = randomUUID();
        const project = { ...data, id, memberIds: data.memberIds || [] };
        projects.set(id, project);
        return project;
    },

    getById: (id: string): Project | undefined => {
        return projects.get(id);
    },

    getAll: (): Project[] => {
        return Array.from(projects.values());
    },

    update: (id: string, data: Partial<Omit<Project, 'id'>>): Project | undefined => {
        const project = projects.get(id);
        if (!project) {
            return undefined;
        }
        const updatedProject = { ...project, ...data };
        projects.set(id, updatedProject);
        return updatedProject;
    },

    delete: (id: string): boolean => {
        return projects.delete(id);
    },

    addMember: (projectId: string, userId: string): Project | undefined => {
        const project = projects.get(projectId);
        if (!project) {
            return undefined;
        }
        if (!project.memberIds.includes(userId)) {
            project.memberIds.push(userId);
        }
        projects.set(projectId, project);
        return project;
    },

    removeMember: (projectId: string, userId: string): Project | undefined => {
        const project = projects.get(projectId);
        if (!project) {
            return undefined;
        }
        project.memberIds = project.memberIds.filter(id => id !== userId);
        projects.set(projectId, project);
        return project;
    }
};
