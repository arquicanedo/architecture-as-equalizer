// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserBody {
  name: string;
  email: string;
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string;
}

export interface AddMemberBody {
  userId: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in-progress'],
  'in-progress': ['done'],
  done: [],
};

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
}

export interface UpdateTaskStatusBody {
  status: TaskStatus;
}

export interface AssignTaskBody {
  assigneeId: string | null;
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CreateCommentBody {
  taskId: string;
  authorId: string;
  body: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

export interface ParsedRequest {
  method: string;
  pathname: string;
  segments: string[];
  query: Record<string, string>;
  body: unknown;
}

export interface RouteContext {
  req: ParsedRequest;
  params: Record<string, string>;
}

export type RouteHandler = (ctx: RouteContext) => RouteResponse | Promise<RouteResponse>;

export interface RouteResponse {
  status: number;
  body: unknown;
}
