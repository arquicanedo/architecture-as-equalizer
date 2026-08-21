import * as http from 'http';
import { eventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { Router } from './router';

const PORT = process.env.PORT || 3000;

// 1. Instantiate Event Bus
// (Using the exported singleton instance)

// 2. Instantiate Services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
// NotificationService subscribes to events, so it must be instantiated.
const notificationService = new NotificationService(eventBus);

// 3. Instantiate Router
const router = new Router(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

// 4. Create and Start HTTP Server
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    router.handleRequest(req, res);
});

export function startServer() {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
    return server;
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}
