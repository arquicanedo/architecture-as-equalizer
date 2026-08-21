/**
 * Main entry point - Sets up the HTTP server and wires all services together
 */

import { createServer } from 'http';
import { eventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { APIRouter } from './api-router';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(
  eventBus,
  taskService,
  userService
);

// Initialize API router
const router = new APIRouter(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

// Create and start server
const server = createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  await router.handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`Task Management API server listening on port ${PORT}`);
});

export { userService, projectService, taskService, commentService, notificationService };
