import http from 'http';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService();
const notificationService = new NotificationService();

const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

const server = http.createServer((req, res) => {
    router.handle(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server shut down.');
        process.exit(0);
    });
});
