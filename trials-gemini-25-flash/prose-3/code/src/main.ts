import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { EventBus } from './event-bus';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { ApiRouter } from './api-router';
import { sendErrorResponse } from './utils';

const PORT = process.env.PORT || 3000;

async function main() {
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
    notificationService
  );

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS for demo purposes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      await apiRouter.handleRequest(req, res);
    } catch (error: any) { // Explicitly type error as any
      console.error('Unhandled request error:', error);
      sendErrorResponse(res, 500, error.message || 'Internal Server Error');
    }
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('  GET /users, POST /users, GET/PUT/DELETE /users/:id');
    console.log('  GET /projects, POST /projects, GET/PUT/DELETE /projects/:id, POST/DELETE /projects/:id/members');
    console.log('  GET /tasks?projectId=xxx, POST /tasks, GET/PUT/DELETE /tasks/:id, PUT /tasks/:id/status, PUT /tasks/:id/assign');
    console.log('  GET /comments?taskId=xxx, POST /comments, GET/DELETE /comments/:id');
    console.log('  GET /notifications?userId=xxx, PUT /notifications/:id/read');
  });
}

main();
