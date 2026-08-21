import { ParsedRequest, ResponseHelper, Task, TaskStatus } from "../types";
import { store } from "../store";
import { generateId, createNotification } from "../utils";

const VALID_STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];

// Allowed transitions: from -> to[]
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["done"],
  done: [],
};

function isValidStatus(s: unknown): s is TaskStatus {
  return typeof s === "string" && VALID_STATUSES.includes(s as TaskStatus);
}

// GET /tasks  (optional query: ?projectId=xxx)
export function listTasks(req: ParsedRequest, res: ResponseHelper): void {
  let tasks = Array.from(store.tasks.values());
  const { projectId } = req.query;
  if (projectId) {
    tasks = tasks.filter((t) => t.projectId === projectId);
  }
  res.json(200, tasks);
}

// POST /tasks
export function createTask(req: ParsedRequest, res: ResponseHelper): void {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body.title !== "string" || typeof body.projectId !== "string") {
    res.error(400, "Fields 'title' and 'projectId' are required strings");
    return;
  }

  const title = body.title.trim();
  const projectId = body.projectId.trim();

  if (!title || !projectId) {
    res.error(400, "Fields 'title' and 'projectId' must not be empty");
    return;
  }

  if (!store.projects.has(projectId)) {
    res.error(404, `Project '${projectId}' not found`);
    return;
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  let assigneeId: string | null = null;
  if (body.assigneeId !== undefined && body.assigneeId !== null) {
    if (typeof body.assigneeId !== "string") {
      res.error(400, "Field 'assigneeId' must be a string or null");
      return;
    }
    const aid = body.assigneeId.trim();
    if (!store.users.has(aid)) {
      res.error(404, `User '${aid}' not found`);
      return;
    }
    assigneeId = aid;
  }

  let status: TaskStatus = "todo";
  if (body.status !== undefined) {
    if (!isValidStatus(body.status)) {
      res.error(400, `Field 'status' must be one of: ${VALID_STATUSES.join(", ")}`);
      return;
    }
    status = body.status;
  }

  const task: Task = {
    id: generateId(),
    title,
    description,
    status,
    assigneeId,
    projectId,
  };

  store.tasks.set(task.id, task);

  // Notify assignee if set
  if (assigneeId) {
    const assignee = store.users.get(assigneeId);
    if (assignee) {
      createNotification(
        assigneeId,
        `You have been assigned to task '${title}'`
      );
    }
  }

  res.json(201, task);
}

// GET /tasks/:id
export function getTask(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const task = store.tasks.get(id);
  if (!task) {
    res.error(404, `Task '${id}' not found`);
    return;
  }
  res.json(200, task);
}

// PUT /tasks/:id
export function updateTask(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const task = store.tasks.get(id);
  if (!task) {
    res.error(404, `Task '${id}' not found`);
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body) {
    res.error(400, "Request body is required");
    return;
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      res.error(400, "Field 'title' must be a non-empty string");
      return;
    }
    task.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      res.error(400, "Field 'description' must be a string");
      return;
    }
    task.description = body.description.trim();
  }

  store.tasks.set(id, task);
  res.json(200, task);
}

// DELETE /tasks/:id
export function deleteTask(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  if (!store.tasks.has(id)) {
    res.error(404, `Task '${id}' not found`);
    return;
  }
  store.tasks.delete(id);

  // Cascade: remove comments on this task
  for (const [commentId, comment] of store.comments.entries()) {
    if (comment.taskId === id) {
      store.comments.delete(commentId);
    }
  }

  res.json(200, { message: `Task '${id}' deleted` });
}

// PUT /tasks/:id/status  — body: { status }
export function updateTaskStatus(
  req: ParsedRequest,
  res: ResponseHelper
): void {
  const id = req.segments[1];
  const task = store.tasks.get(id);
  if (!task) {
    res.error(404, `Task '${id}' not found`);
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body || !isValidStatus(body.status)) {
    res.error(
      400,
      `Field 'status' is required and must be one of: ${VALID_STATUSES.join(", ")}`
    );
    return;
  }

  const newStatus = body.status;
  const allowed = STATUS_TRANSITIONS[task.status];

  if (!allowed.includes(newStatus)) {
    res.error(
      422,
      `Invalid status transition from '${task.status}' to '${newStatus}'. ` +
        `Allowed: ${allowed.length ? allowed.join(", ") : "none"}`
    );
    return;
  }

  task.status = newStatus;
  store.tasks.set(id, task);

  // Notify assignee about status change
  if (task.assigneeId) {
    createNotification(
      task.assigneeId,
      `Task '${task.title}' status changed to '${newStatus}'`
    );
  }

  res.json(200, task);
}

// PUT /tasks/:id/assign  — body: { assigneeId } (null to unassign)
export function assignTask(req: ParsedRequest, res: ResponseHelper): void {
  const id = req.segments[1];
  const task = store.tasks.get(id);
  if (!task) {
    res.error(404, `Task '${id}' not found`);
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (body === null || body === undefined) {
    res.error(400, "Request body is required");
    return;
  }

  if (!("assigneeId" in body)) {
    res.error(400, "Field 'assigneeId' is required (use null to unassign)");
    return;
  }

  const rawAssigneeId = body.assigneeId;

  if (rawAssigneeId === null) {
    task.assigneeId = null;
    store.tasks.set(id, task);
    res.json(200, task);
    return;
  }

  if (typeof rawAssigneeId !== "string" || !rawAssigneeId.trim()) {
    res.error(400, "Field 'assigneeId' must be a non-empty string or null");
    return;
  }

  const assigneeId = rawAssigneeId.trim();
  if (!store.users.has(assigneeId)) {
    res.error(404, `User '${assigneeId}' not found`);
    return;
  }

  task.assigneeId = assigneeId;
  store.tasks.set(id, task);

  // Notify new assignee
  const assignee = store.users.get(assigneeId);
  if (assignee) {
    createNotification(
      assigneeId,
      `You have been assigned to task '${task.title}'`
    );
  }

  res.json(200, task);
}
