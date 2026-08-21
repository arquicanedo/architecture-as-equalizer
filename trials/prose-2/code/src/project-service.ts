import { randomUUID } from "crypto";
import { EventBus } from "./event-bus";
import { Project } from "./types";

/**
 * ProjectService — owns all project data.
 *
 * Publishes:
 *   • member.added   — when a user is added to a project
 */
export class ProjectService {
  private projects: Map<string, Project> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  createProject(data: { name: string; description: string }): Project {
    if (!data.name) throw new Error("name is required");

    const project: Project = {
      id: randomUUID(),
      name: data.name,
      description: data.description ?? "",
      memberIds: [],
    };

    this.projects.set(project.id, project);
    return project;
  }

  getProject(id: string): Project {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project "${id}" not found`);
    return project;
  }

  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  updateProject(
    id: string,
    data: Partial<{ name: string; description: string }>
  ): Project {
    const project = this.getProject(id);

    const updated: Project = {
      ...project,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
    };

    this.projects.set(id, updated);
    return updated;
  }

  deleteProject(id: string): void {
    if (!this.projects.has(id)) throw new Error(`Project "${id}" not found`);
    this.projects.delete(id);
  }

  // ── Member Management ─────────────────────────────────────────────────────

  addMember(projectId: string, userId: string): Project {
    const project = this.getProject(projectId);

    if (project.memberIds.includes(userId)) {
      throw new Error(
        `User "${userId}" is already a member of project "${projectId}"`
      );
    }

    const updated: Project = {
      ...project,
      memberIds: [...project.memberIds, userId],
    };

    this.projects.set(projectId, updated);

    this.eventBus.publish("member.added", {
      projectId,
      projectName: updated.name,
      userId,
    });

    return updated;
  }

  removeMember(projectId: string, userId: string): Project {
    const project = this.getProject(projectId);

    if (!project.memberIds.includes(userId)) {
      throw new Error(
        `User "${userId}" is not a member of project "${projectId}"`
      );
    }

    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((id) => id !== userId),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  /** Convenience: returns true if a project with this id exists. */
  exists(id: string): boolean {
    return this.projects.has(id);
  }
}
