import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createServer } from './router';

const bus = new EventBus();

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(bus);
const commentService = new CommentService(bus, {
  getTaskTitle: (taskId: string) => taskService.getById(taskId)?.title,
  getUserName: (userId: string) => userService.getById(userId)?.name,
});
const notificationService = new NotificationService(bus, {
  getTaskAssigneeId: (taskId: string) => taskService.getById(taskId)?.assigneeId,
});

const server = createServer({ userService, projectService, taskService, commentService, notificationService });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
