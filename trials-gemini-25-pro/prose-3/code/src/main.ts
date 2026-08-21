import * as http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { ApiRouter } from './api-router';

const eventBus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService(eventBus);
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus);

const apiRouter = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService,
    eventBus
);

const server = http.createServer((req, res) => {
    apiRouter.handleRequest(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
