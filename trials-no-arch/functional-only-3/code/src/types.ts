// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
}

export type CreateUserBody = Omit<User, "id">;
export type UpdateUserBody = Partial<CreateUserBody>;

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export type CreateProjectBody = Omit<Project, "id" | "memberIds">;
export type UpdateProjectBody = Partial<Omit<Project, "id" | "memberIds">>;

export interface AddMemberBody {
  userId: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export type CreateTaskBody = {
  title: string;
  description: string;
  projectId: string;
  assigneeId?: string | null;
};

export type UpdateTaskBody = Partial<{
  title: string;
  description: string;
}>;

export interface UpdateStatusBody {
  status: TaskStatus;
}

export interface AssignTaskBody {
  userId: string | null;
}

// Valid task status transitions
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["done"],
  done: [],
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO timestamp
}

export type CreateCommentBody = {
  taskId: string;
  authorId: string;
  body: string;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationEvent = "task_assigned" | "comment_added" | "status_changed";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  event: NotificationEvent;
  read: boolean;
  createdAt: string; // ISO timestamp
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

export interface ParsedRequest {
  method: string;
  pathname: string;
  segments: string[];
  query: Record<string, string>;
  body: unknown;
}

export interface RouteHandler {
  (req: ParsedRequest): Promise<RouteResponse>;
}

export interface RouteResponse {
  status: number;
  body: unknown;
}
