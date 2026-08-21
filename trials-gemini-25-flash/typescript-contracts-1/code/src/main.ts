import * as http from 'node:http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';
import {
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentCreatedRawPayload,
} from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function bootstrap() {
  const eventBus = new EventBus();

  // Initialize services
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService();

  // --- Event Wiring ---

  // Task assigned notification
  eventBus.subscribe("task.assigned", (payload: unknown) => {
    const { taskId, taskTitle, assigneeId } = payload as TaskAssignedPayload;
    try {
      const message = `Task '${taskTitle}' assigned to you`;
      notificationService.createNotification(assigneeId, message);
      console.log(`Notification for ${assigneeId}: ${message}`);
    } catch (error) {
      console.error(`Error creating notification for task assignment for task ${taskId}:`, error);
    }
  });

  // Task status changed notification
  eventBus.subscribe("task.statusChanged", (payload: unknown) => {
    const { taskId, taskTitle, assigneeId, newStatus } = payload as TaskStatusChangedPayload;
    if (assigneeId) {
      try {
        const message = `Task '${taskTitle}' status changed to ${newStatus}`;
        notificationService.createNotification(assigneeId, message);
        console.log(`Notification for ${assigneeId}: ${message}`);
      } catch (error) {
        console.error(`Error creating notification for task status change for task ${taskId}:`, error);
      }
    }
  });

  // Comment added notification (enriched by main.ts)
  eventBus.subscribe("comment.created.raw", (payload: unknown) => {
    const { commentId, taskId, authorId } = payload as CommentCreatedRawPayload;
    try {
      // These lookups are safe here because main.ts orchestrates services
      const task = taskService.getById(taskId);
      const author = userService.getById(authorId);

      if (task.assigneeId) {
        // Notify the task assignee about the new comment
        const message = `A new comment was added to your task '${task.title}' by ${author.name}`;
        notificationService.createNotification(task.assigneeId, message);
        console.log(`Notification for ${task.assigneeId}: ${message}`);
      }
    } catch (error) {
      console.error(`Error processing comment.created.raw for comment ${commentId}:`, error);
    }
  });

  // Initialize router with services
  const router = new ApiRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // Create HTTP server
  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    router.handleRequest(req, res);
  });

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

bootstrap();
