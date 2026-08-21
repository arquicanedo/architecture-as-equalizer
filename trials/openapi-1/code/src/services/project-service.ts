// ============================================================
// Project Service
// Owns the in-memory project store.
// No imports from other services; no event publishing.
// ============================================================

import { randomUUID } from 'crypto';
import {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ServiceResult,
  ok,
  fail,
} from '../types.js';

class ProjectService {
  private readonly store = new Map<string, Project>();

  listProjects(): ServiceResult<Project[]> {
    return ok(Array.from(this.store.values()));
  }

  getProject(id: string): ServiceResult<Project> {
    const project = this.store.get(id);
    if (!project) return fail(404, `Project "${id}" not found`);
    return ok(project);
  }

  createProject(input: CreateProjectInput): ServiceResult<Project> {
    if (!input.name?.trim()) return fail(400, 'Field "name" is required');
    if (input.description === undefined || input.description === null)
      return fail(400, 'Field "description" is required');

    const project: Project = {
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description,
      memberIds: [],
    };
    this.store.set(project.id, project);
    return ok(project);
  }

  updateProject(id: string, input: UpdateProjectInput): ServiceResult<Project> {
    const existing = this.store.get(id);
    if (!existing) return fail(404, `Project "${id}" not found`);

    const updated: Project = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    };
    this.store.set(id, updated);
    return ok(updated);
  }

  deleteProject(id: string): ServiceResult<void> {
    if (!this.store.has(id)) return fail(404, `Project "${id}" not found`);
    this.store.delete(id);
    return ok(undefined);
  }

  addMember(projectId: string, userId: string): ServiceResult<Project> {
    const project = this.store.get(projectId);
    if (!project) return fail(404, `Project "${projectId}" not found`);

    if (!project.memberIds.includes(userId)) {
      const updated: Project = {
        ...project,
        memberIds: [...project.memberIds, userId],
      };
      this.store.set(projectId, updated);
      return ok(updated);
    }
    return ok(project); // already a member — idempotent
  }

  removeMember(projectId: string, userId: string): ServiceResult<Project> {
    const project = this.store.get(projectId);
    if (!project) return fail(404, `Project "${projectId}" not found`);

    const updated: Project = {
      ...project,
      memberIds: project.memberIds.filter((id) => id !== userId),
    };
    this.store.set(projectId, updated);
    return ok(updated);
  }
}

export const projectService = new ProjectService();
