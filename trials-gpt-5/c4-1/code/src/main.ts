import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createHttpServer } from './router';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function start() {
  const eventBus = new EventBus();

  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);

  // For comment service, we need functions to resolve task title and user name without direct service references.
  const getTaskTitle = (taskId: string): string | undefined => {
    const task = taskService.getById(taskId);
    return task?.title;
  };
  const getUserName = (userId: string): string | undefined => {
    const user = userService.getById(userId);
    return user?.name;
  };

  const commentService = new CommentService(eventBus, getTaskTitle, getUserName);
  const notificationService = new NotificationService(eventBus);

  const server = createHttpServer({ userService, projectService, taskService, commentService, notificationService });

  server.listen(PORT, () => {
    console.log(`Task Management API listening on http://localhost:${PORT}`);
  });
}

start();
