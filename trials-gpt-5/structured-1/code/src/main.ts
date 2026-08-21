import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createApiServer } from './router';

const bus = new EventBus();

const userSvc = new UserService();
const projectSvc = new ProjectService();
const taskSvc = new TaskService(bus);

// helpers passed to comment/notification to avoid direct service calls
const getTaskTitle = (taskId: string) => taskSvc.getById(taskId)?.title;
const getUserName = (userId: string) => userSvc.getById(userId)?.name;
const getTaskAssignee = (taskId: string) => taskSvc.getById(taskId)?.assigneeId;

const commentSvc = new CommentService(bus, getTaskTitle, getUserName);
const notifSvc = new NotificationService(bus, getTaskAssignee);

const server = createApiServer(userSvc, projectSvc, taskSvc, commentSvc, notifSvc);

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => {
  console.log(`Task Management API running on http://localhost:${PORT}`);
});
