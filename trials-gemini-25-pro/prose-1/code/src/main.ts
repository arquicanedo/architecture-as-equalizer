
import * as http from 'http';
import { eventBus } from './event-bus';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService, Task } from './task-service';
import { CommentService, Comment } from './comment-service';
import { NotificationService } from './notification-service';
import { ApiRouter } from './router';

// Instantiate services
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService();
const notificationService = new NotificationService();

// Wire up event listeners
eventBus.subscribe('task.assigned', (task: Task) => {
    notificationService.handleTaskAssigned(task);
});

eventBus.subscribe('task.statusChanged', (task: Task) => {
    notificationService.handleTaskStatusChanged(task);
});

eventBus.subscribe('comment.added', (comment: Comment) => {
    const task = taskService.getTask(comment.taskId);
    if (task && task.assigneeId && task.assigneeId !== comment.authorId) {
        notificationService.createNotification(
            task.assigneeId,
            `A new comment was added to task '${task.title}' by another user.`
        );
    }
});


// Instantiate the router with the services
const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
);

// Create and start the HTTP server
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    router.handleRequest(req, res);
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export { server };
