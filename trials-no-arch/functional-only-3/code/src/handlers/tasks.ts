import { tasks, projects, users, newId, createNotification, notifyProjectMembers } from "../store.js";
import type {
  RouteHandler,
  CreateTaskBody,
  UpdateTaskBody,
  UpdateStatusBody,
  AssignTaskBody,
  TaskStatus,
} from "../types.js";
import { VALID_TRANSITIONS } from "../types.js";

// ─── GET /tasks ───────────────────────────────────────────────────────────────

export const listTasks: RouteHandler = async (req) => {
  const { projectId } = req.query;
  let result = Array.from(tasks.values());
  if (projectId) {
    result = result.filter((t) => t.projectId === projectId);
  }
  return { status: 200, body: result };
};

// ─── POST /tasks ──────────────────────────────────────────────────────────────

export const createTask: RouteHandler = async (req) => {
  const data = req.body as CreateTaskBody;

  if (!data || typeof data.title !== "string" || !data.title.trim()) {
    return { status: 400, body: { error: "title is required" } };
  }
  if (typeof data.description !== "string") {
    return { status: 400, body: { error: "description is required" } };
  }
  if (typeof data.projectId !== "string" || !data.projectId.trim()) {
    return { status: 400, body: { error: "projectId is required" } };
  }

  const project = projects.get(data.projectId.trim());
  if (!project) {
    return { status: 404, body: { error: "Project not found" } };
  }

  let assigneeId: string | null = null;
  if (data.assigneeId !== undefined && data.assigneeId !== null) {
    if (!users.has(data.assigneeId)) {
      return { status: 404, body: { error: "Assignee user not found" } };
    }
    assigneeId = data.assigneeId;
  }

  const task = {
    id: newId(),
    title: data.title.trim(),
    description: data.description.trim(),
    status: "todo" as TaskStatus,
    assigneeId,
    projectId: data.projectId.trim(),
  };
  tasks.set(task.id, task);

  // Notify assignee if set
  if (assigneeId) {
    createNotification(
      assigneeId,
      `You have been assigned to task "${task.title}" in project "${project.name}"`,
      "task_assigned"
    );
  }

  return { status: 201, body: task };
};

// ─── GET /tasks/:id ───────────────────────────────────────────────────────────

export const getTask: RouteHandler = async (req) => {
  const task = tasks.get(req.query["id"]);
  if (!task) return { status: 404, body: { error: "Task not found" } };
  return { status: 200, body: task };
};

// ─── PUT /tasks/:id ───────────────────────────────────────────────────────────

export const updateTask: RouteHandler = async (req) => {
  const task = tasks.get(req.query["id"]);
  if (!task) return { status: 404, body: { error: "Task not found" } };

  const data = req.body as UpdateTaskBody;
  if (!data) return { status: 400, body: { error: "Request body is required" } };

  if (data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      return { status: 400, body: { error: "title must be a non-empty string" } };
    }
    task.title = data.title.trim();
  }

  if (data.description !== undefined) {
    if (typeof data.description !== "string") {
      return { status: 400, body: { error: "description must be a string" } };
    }
    task.description = data.description.trim();
  }

  tasks.set(task.id, task);
  return { status: 200, body: task };
};

// ─── DELETE /tasks/:id ────────────────────────────────────────────────────────

export const deleteTask: RouteHandler = async (req) => {
  const id = req.query["id"];
  if (!tasks.has(id)) return { status: 404, body: { error: "Task not found" } };
  tasks.delete(id);
  return { status: 200, body: { message: "Task deleted" } };
};

// ─── PUT /tasks/:id/status ────────────────────────────────────────────────────

export const updateTaskStatus: RouteHandler = async (req) => {
  const task = tasks.get(req.query["id"]);
  if (!task) return { status: 404, body: { error: "Task not found" } };

  const data = req.body as UpdateStatusBody;
  if (!data || typeof data.status !== "string") {
    return { status: 400, body: { error: "status is required" } };
  }

  const newStatus = data.status as TaskStatus;
  const allowed = VALID_TRANSITIONS[task.status];

  if (!allowed) {
    return { status: 400, body: { error: `Unknown current status: ${task.status}` } };
  }

  if (!allowed.includes(newStatus)) {
    return {
      status: 422,
      body: {
        error: `Invalid status transition from "${task.status}" to "${newStatus}". Allowed: [${allowed.join(", ") || "none"}]`,
      },
    };
  }

  const previousStatus = task.status;
  task.status = newStatus;
  tasks.set(task.id, task);

  // Notify all project members about status change
  const project = projects.get(task.projectId);
  if (project) {
    notifyProjectMembers(
      task.projectId,
      null, // notify everyone
      `Task "${task.title}" status changed from "${previousStatus}" to "${newStatus}" in project "${project.name}"`,
      "status_changed"
    );

    // Also notify assignee if they are not already a project member
    if (task.assigneeId && !project.memberIds.includes(task.assigneeId)) {
      createNotification(
        task.assigneeId,
        `Task "${task.title}" status changed from "${previousStatus}" to "${newStatus}"`,
        "status_changed"
      );
    }
  }

  return { status: 200, body: task };
};

// ─── PUT /tasks/:id/assign ────────────────────────────────────────────────────

export const assignTask: RouteHandler = async (req) => {
  const task = tasks.get(req.query["id"]);
  if (!task) return { status: 404, body: { error: "Task not found" } };

  const data = req.body as AssignTaskBody;
  if (data === null || data === undefined || !("userId" in (data as object))) {
    return { status: 400, body: { error: "userId is required (use null to unassign)" } };
  }

  const { userId } = data;

  if (userId !== null) {
    if (typeof userId !== "string" || !userId.trim()) {
      return { status: 400, body: { error: "userId must be a non-empty string or null" } };
    }
    if (!users.has(userId)) {
      return { status: 404, body: { error: "User not found" } };
    }
  }

  const previousAssigneeId = task.assigneeId;
  task.assigneeId = userId;
  tasks.set(task.id, task);

  const project = projects.get(task.projectId);
  const projectName = project ? project.name : "Unknown Project";

  // Notify newly assigned user
  if (userId && userId !== previousAssigneeId) {
    createNotification(
      userId,
      `You have been assigned to task "${task.title}" in project "${projectName}"`,
      "task_assigned"
    );
  }

  return { status: 200, body: task };
};
