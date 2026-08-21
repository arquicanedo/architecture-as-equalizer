import { createHttpServer, Router } from "./router";
import { EventBus } from "./event-bus";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { UserService } from "./services/user-service";

// Wiring
const bus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(bus);
const commentService = new CommentService(bus);

// Helper lookups passed to NotificationService to avoid cross-service imports
const getUserName = (userId: string) => {
  try {
    return userService.getById(userId).name;
  } catch {
    return null;
  }
};
const getTaskTitle = (taskId: string) => {
  try {
    return taskService.getById(taskId).title;
  } catch {
    return null;
  }
};
const getTaskAssigneeId = (taskId: string) => {
  try {
    return taskService.getById(taskId).assigneeId;
  } catch {
    return null;
  }
};

const notificationService = new NotificationService(bus, getUserName, getTaskTitle, getTaskAssigneeId);
notificationService.wireSubscriptions();

const router = new Router(userService, projectService, taskService, commentService, notificationService);
const server = createHttpServer(router);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
