import { createServer } from "http";
import { EventBus } from "./event-bus";
import { UserService } from "./services/user-service";
import { ProjectService } from "./services/project-service";
import { TaskService } from "./services/task-service";
import { CommentService } from "./services/comment-service";
import { NotificationService } from "./services/notification-service";
import { Router } from "./router";
import { TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload } from "./event-bus";

export class Application {
  private eventBus: EventBus;
  private userService: UserService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private commentService: CommentService;
  private notificationService: NotificationService;
  private router: Router;

  constructor() {
    // Initialize Event Bus
    this.eventBus = new EventBus();

    // Initialize Services
    this.userService = new UserService();
    this.projectService = new ProjectService();
    this.notificationService = new NotificationService();

    // Services that depend on EventBus
    this.taskService = new TaskService(this.eventBus);

    const getUserName = (userId: string): string => {
      try {
        return this.userService.getById(userId).name;
      } catch {
        return "Unknown User";
      }
    };

    this.commentService = new CommentService(this.eventBus, getUserName);

    // Initialize Router
    this.router = new Router(
      this.userService,
      this.projectService,
      this.taskService,
      this.commentService,
      this.notificationService
    );

    // Wire up event subscriptions
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    // NotificationService subscribes to task.assigned
    this.eventBus.subscribe("task.assigned", (payload: unknown) => {
      const p = payload as TaskAssignedPayload;
      this.notificationService.createNotification(
        p.assigneeId,
        `Task '${p.taskTitle}' assigned to you`
      );
    });

    // NotificationService subscribes to task.statusChanged
    this.eventBus.subscribe("task.statusChanged", (payload: unknown) => {
      const p = payload as TaskStatusChangedPayload;
      if (p.assigneeId) {
        this.notificationService.createNotification(
          p.assigneeId,
          `Task '${p.taskTitle}' status changed to ${p.newStatus}`
        );
      }
    });

    // NotificationService subscribes to comment.added
    this.eventBus.subscribe("comment.added", (payload: unknown) => {
      const p = payload as CommentAddedPayload;
      const task = this.getTaskById(p.taskId);
      if (task && task.assigneeId && task.assigneeId !== p.authorId) {
        this.notificationService.createNotification(
          task.assigneeId,
          `${p.authorName} commented on task '${task.title}'`
        );
      }
    });
  }

  private getTaskById(taskId: string) {
    try {
      return this.taskService.getById(taskId);
    } catch {
      return null;
    }
  }

  start(port: number = 3000): void {
    const server = createServer((req, res) => {
      this.router.handleRequest(req, res).catch((error) => {
        console.error("Unhandled error in request handler:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      });
    });

    server.listen(port, () => {
      console.log(`Task Management API listening on http://localhost:${port}`);
    });
  }

  // Expose services for testing/demo
  getServices() {
    return {
      userService: this.userService,
      projectService: this.projectService,
      taskService: this.taskService,
      commentService: this.commentService,
      notificationService: this.notificationService,
    };
  }
}

// Start the server if this is the main module
if (require.main === module) {
  const app = new Application();
  app.start(3000);
}

export default Application;
