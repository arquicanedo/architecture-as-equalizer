import * as http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const PORT = process.env.PORT || 3000;

// 1. Initialize Event Bus
const eventBus = new EventBus();

// 2. Initialize Services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
// As per the deduction, inject services that are needed for generating event payloads
const commentService = new CommentService(eventBus, userService, taskService);
const notificationService = new NotificationService(eventBus, taskService);

// 3. Initialize Router
const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

// 4. Create and start HTTP server
const server = http.createServer((req, res) => {
    router.handle(req, res);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export server for demo script
export { server };
