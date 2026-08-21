import { createServer } from "http";
import { register, dispatch } from "./router";

// User handlers
import {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from "./handlers/users";

// Project handlers
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from "./handlers/projects";

// Task handlers
import {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
} from "./handlers/tasks";

// Comment handlers
import {
  listComments,
  createComment,
  getComment,
  deleteComment,
} from "./handlers/comments";

// Notification handlers
import {
  listNotifications,
  markNotificationRead,
} from "./handlers/notifications";

function registerRoutes(): void {
  // ── Users ────────────────────────────────────────────
  register("GET",    ["users"],           listUsers);
  register("POST",   ["users"],           createUser);
  register("GET",    ["users", ":id"],    getUser);
  register("PUT",    ["users", ":id"],    updateUser);
  register("DELETE", ["users", ":id"],    deleteUser);

  // ── Projects ─────────────────────────────────────────
  register("GET",    ["projects"],                        listProjects);
  register("POST",   ["projects"],                        createProject);
  register("GET",    ["projects", ":id"],                 getProject);
  register("PUT",    ["projects", ":id"],                 updateProject);
  register("DELETE", ["projects", ":id"],                 deleteProject);
  register("POST",   ["projects", ":id", "members"],      addMember);
  register("DELETE", ["projects", ":id", "members"],      removeMember);

  // ── Tasks ─────────────────────────────────────────────
  register("GET",    ["tasks"],                 listTasks);
  register("POST",   ["tasks"],                 createTask);
  register("GET",    ["tasks", ":id"],          getTask);
  register("PUT",    ["tasks", ":id"],          updateTask);
  register("DELETE", ["tasks", ":id"],          deleteTask);
  register("PUT",    ["tasks", ":id", "status"],  updateTaskStatus);
  register("PUT",    ["tasks", ":id", "assign"],  assignTask);

  // ── Comments ──────────────────────────────────────────
  register("GET",    ["comments"],          listComments);
  register("POST",   ["comments"],          createComment);
  register("GET",    ["comments", ":id"],   getComment);
  register("DELETE", ["comments", ":id"],   deleteComment);

  // ── Notifications ─────────────────────────────────────
  register("GET", ["notifications"],                     listNotifications);
  register("PUT", ["notifications", ":id", "read"],      markNotificationRead);
}

export function startServer(port: number): void {
  registerRoutes();

  const server = createServer((req, res) => {
    dispatch(req, res).catch((err) => {
      console.error("Unexpected error in dispatch:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    });
  });

  server.listen(port, () => {
    console.log(`Task Management API listening on http://localhost:${port}`);
  });
}
