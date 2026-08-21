import * as http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';

const PORT = 3000;

async function bootstrap() {
    // 1. Initialize Event Bus
    const eventBus = new EventBus();

    // 2. Initialize Services
    const userService = new UserService();
    const projectService = new ProjectService();
    const taskService = new TaskService(eventBus);
    const commentService = new CommentService(eventBus);
    const notificationService = new NotificationService(eventBus);

    // 3. Create a registry of services to pass to the router
    const services = {
        userService,
        projectService,
        taskService,
        commentService,
        notificationService,
    };

    // 4. Initialize API Router with services
    const apiRouter = new ApiRouter(services);

    // 5. Create HTTP server
    const server = http.createServer(async (req, res) => {
        // Handle CORS (if needed, simplified for this example)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        try {
            await apiRouter.handleRequest(req, res);
        } catch (error) {
            console.error('Unhandled error in server request:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error', detail: (error as Error).message }));
            }
        }
    });

    // 6. Start the server
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    // Optional: Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });
}

bootstrap();
