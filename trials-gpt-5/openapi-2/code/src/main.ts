import { createServer } from './router';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService();
const commentService = new CommentService();
const notificationService = new NotificationService();

const server = createServer({
  userService,
  projectService,
  taskService,
  commentService,
  notificationService,
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
