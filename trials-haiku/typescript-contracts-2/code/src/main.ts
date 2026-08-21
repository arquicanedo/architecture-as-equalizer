// ============================================================
// Main Entry Point — Event Wiring & Server Start
// ============================================================

import * as http from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";
import {
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "./event-bus.js";

class Application {
  private eventBus: EventBus;
  private userService: UserService;
  private projectService: ProjectService;
  private taskService: TaskService;
  private commentService: CommentService;
  private notificationService: NotificationService;
  private router: Router;
  private server: http.Server | null = null;

  constructor() {
    // Initialize services
    this.eventBus = new EventBus();
    this.userService = new UserService();
    this.projectService = new ProjectService();
    this.taskService = new TaskService(this.eventBus);
    this.commentService = new CommentService(this.eventBus);
    this.notificationService = new NotificationService();

    // Set up event subscriptions
    this.setupEventSubscriptions();

    // Initialize router
    this.router = new Router({
      userService: this.userService,
      projectService: this.projectService,
      taskService: this.taskService,
      commentService: this.commentService,
      notificationService: this.notificationService,
      commentServicePublish: (commentId, taskId, taskTitle, authorId, authorName) => {
        this.commentService.publishCommentAdded(commentId, taskId, taskTitle, authorId, authorName);
      },
      userServiceGetById: (id) => this.userService.getById(id),
      taskServiceGetById: (id) => this.taskService.getById(id),
    });
  }

  private setupEventSubscriptions(): void {
    // NotificationService subscribes to "task.assigned"
    this.eventBus.subscribe("task.assigned", (payload: unknown) => {
      const p = payload as TaskAssignedPayload;
      this.notificationService.createNotification(
        p.assigneeId,
        `Task '${p.taskTitle}' assigned to you`
      );
    });

    // NotificationService subscribes to "task.statusChanged"
    this.eventBus.subscribe("task.statusChanged", (payload: unknown) => {
      const p = payload as TaskStatusChangedPayload;
      if (p.assigneeId) {
        this.notificationService.createNotification(
          p.assigneeId,
          `Task '${p.taskTitle}' status changed to ${p.newStatus}`
        );
      }
    });

    // NotificationService subscribes to "comment.added"
    this.eventBus.subscribe("comment.added", (payload: unknown) => {
      const p = payload as CommentAddedPayload;
      try {
        const task = this.taskService.getById(p.taskId);
        if (task.assigneeId) {
          this.notificationService.createNotification(
            task.assigneeId,
            `${p.authorName} commented on task '${p.taskTitle}'`
          );
        }
      } catch (e) {
        // Silently ignore if task not found
      }
    });
  }

  start(port: number = 3000): void {
    this.server = http.createServer(async (req, res) => {
      await this.router.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }

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

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new Application();
  app.start(3000);
}

export { Application };
