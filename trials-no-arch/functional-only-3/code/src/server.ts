import { createServer } from "http";
import { Router } from "./router.js";

// ─── Handlers ─────────────────────────────────────────────────────────────────

import { listUsers, createUser, getUser, updateUser, deleteUser } from "./handlers/users.js";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from "./handlers/projects.js";
import {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
} from "./handlers/tasks.js";
import { listComments, createComment, getComment, deleteComment } from "./handlers/comments.js";
import { listNotifications, markNotificationRead } from "./handlers/notifications.js";

// ─── Build router ─────────────────────────────────────────────────────────────

function buildRouter(): Router {
  const router = new Router();

  // Users
  router.get("/users", listUsers);
  router.post("/users", createUser);
  router.get("/users/:id", getUser);
  router.put("/users/:id", updateUser);
  router.delete("/users/:id", deleteUser);

  // Projects
  router.get("/projects", listProjects);
  router.post("/projects", createProject);
  router.get("/projects/:id", getProject);
  router.put("/projects/:id", updateProject);
  router.delete("/projects/:id", deleteProject);
  router.post("/projects/:id/members", addMember);
  router.delete("/projects/:id/members", removeMember);

  // Tasks
  router.get("/tasks", listTasks);
  router.post("/tasks", createTask);
  router.get("/tasks/:id", getTask);
  router.put("/tasks/:id", updateTask);
  router.delete("/tasks/:id", deleteTask);
  router.put("/tasks/:id/status", updateTaskStatus);
  router.put("/tasks/:id/assign", assignTask);

  // Comments
  router.get("/comments", listComments);
  router.post("/comments", createComment);
  router.get("/comments/:id", getComment);
  router.delete("/comments/:id", deleteComment);

  // Notifications
  router.get("/notifications", listNotifications);
  router.put("/notifications/:id/read", markNotificationRead);

  return router;
}

// ─── Create & start server ────────────────────────────────────────────────────

export function startServer(port: number): Promise<void> {
  const router = buildRouter();

  const server = createServer((req, res) => {
    router.dispatch(req, res).catch((err) => {
      console.error("Unhandled error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🚀 Task Management API running on http://localhost:${port}`);
      resolve();
    });
  });
}
