import * as http from 'http';
import { ApiRouter } from './api-router';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';

// Create service instances
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService();
const notificationService = new NotificationService(taskService);

// Set up event subscriptions
notificationService.setupSubscriptions();

// Create the API router
const apiRouter = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

// Create and start the HTTP server
const server = http.createServer((req, res) => {
    apiRouter.handleRequest(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
