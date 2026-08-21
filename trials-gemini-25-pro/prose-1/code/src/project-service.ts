
export interface Project {
    id: string;
    name: string;
    description: string;
    memberIds: string[];
}

export class ProjectService {
    private projects = new Map<string, Project>();
    private nextId = 1;

    createProject(name: string, description: string): Project {
        const id = `proj-${this.nextId++}`;
        const project: Project = { id, name, description, memberIds: [] };
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
        if (project) {
            project.name = name;
            project.description = description;
            return project;
        }
        return undefined;
    }

    deleteProject(id: string): boolean {
        return this.projects.delete(id);
    }

    addMemberToProject(id: string, memberId: string): Project | undefined {
        const project = this.projects.get(id);
        if (project && !project.memberIds.includes(memberId)) {
            project.memberIds.push(memberId);
            return project;
        }
        return undefined;
    }

    removeMemberFromProject(id: string, memberId: string): Project | undefined {
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
