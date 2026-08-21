/**
 * ProjectService — owns all project data.
 *
 * Manages CRUD for projects and the membership list.
 * Member validation (does the user ID actually exist?) is the
 * responsibility of the router, which can call the UserService
 * before delegating to this service.
 */

import { randomUUID } from "crypto";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "../types.js";

export class ProjectService {
  private readonly projects: Map<string, Project> = new Map();

  // ── Create ────────────────────────────────────────────────────────────────

  createProject(input: CreateProjectInput): Project {
    if (!input.name || input.name.trim() === "") {
      throw new Error("Project name is required.");
    }

    const project: Project = {
      id: randomUUID(),
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      memberIds: [],
    };

    this.projects.set(project.id, project);
    return project;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getProject(id: string): Project {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project "${id}" not found.`);
    return project;
  }

  listProjects(): Project[] {
    return [...this.projects.values()];
  }

  // ── Update ────────────────────────────────────────────────────────────────

  updateProject(id: string, input: UpdateProjectInput): Project {
    const project = this.getProject(id);

    if (input.name !== undefined) {
      if (input.name.trim() === "") throw new Error("Project name cannot be empty.");
      project.name = input.name.trim();
    }
    if (input.description !== undefined) {
      project.description = input.description.trim();
    }

    return project;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteProject(id: string): void {
    if (!this.projects.has(id)) throw new Error(`Project "${id}" not found.`);
    this.projects.delete(id);
  }

  // ── Membership ────────────────────────────────────────────────────────────

  /**
   * Add a user to a project's member list.
   * The router is responsible for confirming the user exists first.
   */
  addMember(projectId: string, userId: string): Project {
    const project = this.getProject(projectId);
    if (project.memberIds.includes(userId)) {
      throw new Error(`User "${userId}" is already a member of project "${projectId}".`);
    }
    project.memberIds.push(userId);
    return project;
  }

  /**
   * Remove a user from a project's member list.
   */
  removeMember(projectId: string, userId: string): Project {
    const project = this.getProject(projectId);
    const idx = project.memberIds.indexOf(userId);
    if (idx === -1) {
      throw new Error(`User "${userId}" is not a member of project "${projectId}".`);
    }
    project.memberIds.splice(idx, 1);
    return project;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  projectExists(id: string): boolean {
    return this.projects.has(id);
  }
}
