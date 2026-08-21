import * as http from 'http';
import { eventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export async function bootstrap(): Promise<http.Server> {
    console.log('Initializing services...');

    const userService = new UserService();
    const projectService = new ProjectService();
    const taskService = new TaskService();
    const commentService = new CommentService();
    const notificationService = new NotificationService(eventBus);

    const apiRouter = new ApiRouter(
        userService,
        projectService,
        taskService,
        commentService,
        notificationService
    );

    const server = http.createServer(apiRouter.handleRequest.bind(apiRouter));

    return new Promise((resolve, reject) => {
        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`Access the API at http://localhost:${PORT}`);
            resolve(server);
        });

        server.on('error', (err) => {
            console.error('Server error:', err);
            reject(err);
        });
    });
}

// Only run bootstrap directly if this file is executed as main
if (require.main === module) {
    bootstrap().catch(error => {
        console.error('Failed to bootstrap application:', error);
        process.exit(1);
    });
}
