import http from 'http';
import { createRouter } from './router';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

// Instantiate services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService();
// NotificationService subscribes to events upon instantiation
const notificationService = new NotificationService();

// Create router with services
const router = createRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

// Create and start server
const server = http.createServer(router);

const PORT = process.env.PORT || 3000;

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
