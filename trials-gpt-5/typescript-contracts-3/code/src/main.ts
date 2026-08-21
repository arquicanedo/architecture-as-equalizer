import EventBus from "./event-bus";
import UserService from "./services/user-service";
import ProjectService from "./services/project-service";
import TaskService from "./services/task-service";
import CommentService from "./services/comment-service";
import NotificationService from "./services/notification-service";
import { startServer } from "./router";

const port = 3000;

// Wire up services and event bus
const eventBus = new EventBus();

const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService();

// Event subscriptions
// TaskService publishes
eventBus.subscribe("task.assigned", (payload) => {
  notificationService.handleTaskAssigned(payload as any);
});

eventBus.subscribe("task.statusChanged", (payload) => {
  notificationService.handleTaskStatusChanged(payload as any);
});

// CommentService publishes
// For better messages, we enrich CommentAddedPayload with task title and author name if possible
import { IEventBus, CommentAddedPayload } from "./types";

const enrichCommentPayload = (payload: CommentAddedPayload): CommentAddedPayload => {
  try {
    const task = taskService.getById(payload.taskId);
    const author = userService.getById(payload.authorId);
    return { ...payload, taskTitle: task.title, authorName: author.name };
  } catch {
    return payload;
  }
};

(eventBus as IEventBus).subscribe("comment.added", (raw) => {
  const p = enrichCommentPayload(raw as CommentAddedPayload);
  notificationService.handleCommentAdded(p);
});

startServer(port, {
  userService,
  projectService,
  taskService,
  commentService,
  notificationService,
});

console.log(`Server started on http://localhost:${port}`);
