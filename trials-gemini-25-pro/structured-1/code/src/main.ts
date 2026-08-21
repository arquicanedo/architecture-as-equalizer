import http from "http";
import { EventBus, eventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { ApiRouter } from "./router";

const PORT = process.env.PORT || 3000;

// Instantiate services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus);

// Instantiate router
const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

// Create server
const server = http.createServer((req, res) => {
    router.handleRequest(req, res);
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
