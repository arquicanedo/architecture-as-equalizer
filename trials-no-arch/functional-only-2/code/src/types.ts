export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// HTTP utility types
export type RouteHandler = (
  req: ParsedRequest,
  res: ResponseHelper
) => Promise<void> | void;

export interface ParsedRequest {
  method: string;
  pathname: string;
  segments: string[];
  query: Record<string, string>;
  body: unknown;
}

export interface ResponseHelper {
  json: (statusCode: number, data: unknown) => void;
  error: (statusCode: number, message: string) => void;
}

export interface Route {
  method: string;
  pattern: string[]; // e.g. ["users", ":id"] or ["projects", ":id", "members"]
  handler: RouteHandler;
}
