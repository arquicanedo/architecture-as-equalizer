import {
  Notification,
  NotificationId,
  UserId,
  Event,
  TaskAssignedEvent,
  CommentAddedEvent,
  TaskStatusChangedEvent,
  ProjectMemberAddedEvent,
  TaskStatus,
} from './types';
import { EventBus } from './event-bus.js'; // Corrected import with .js extension
import { generateId } from './utils';

export class NotificationService {
  private notifications: Map<NotificationId, Notification> = new Map();
  private eventBus: EventBus;
  // In a real system, you'd likely fetch task details from TaskService if needed.
  // For this exercise, we'll manage a simplified mapping for assignee lookups.
  private taskAssigneeMap: Map<string, UserId> = new Map(); // taskId -> assigneeId for quick lookup

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.subscribe('task.assigned', this.handleTaskAssigned.bind(this));
    this.eventBus.subscribe('comment.added', this.handleCommentAdded.bind(this));
    this.eventBus.subscribe('task.statusChanged', this.handleTaskStatusChanged.bind(this));
    this.eventBus.subscribe('project.memberAdded', this.handleProjectMemberAdded.bind(this));
  }

  private createNotification(userId: UserId, message: string): Notification {
    const newNotification: Notification = {
      id: generateId(),
      userId,
      message,
      read: false,
      createdAt: Date.now(),
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  private handleTaskAssigned(event: Event): void {
    const payload = event.payload as TaskAssignedEvent;
    const { taskId, assigneeId, previousAssigneeId } = payload;

    this.taskAssigneeMap.set(taskId, assigneeId);

    if (previousAssigneeId && previousAssigneeId !== assigneeId) {
      this.createNotification(previousAssigneeId, `You have been unassigned from task ${taskId}.`);
    }
    this.createNotification(assigneeId, `You have been assigned to task ${taskId}.`);
  }

  private handleCommentAdded(event: Event): void {
    const payload = event.payload as CommentAddedEvent;
    const { taskId, authorId } = payload;
    const assigneeId = this.taskAssigneeMap.get(taskId);

    if (assigneeId && assigneeId !== authorId) {
      this.createNotification(assigneeId, `A new comment was added to task ${taskId} by ${authorId}.`);
    }
  }

  private handleTaskStatusChanged(event: Event): void {
    const payload = event.payload as TaskStatusChangedEvent;
    const { taskId, newStatus } = payload;
    const assigneeId = this.taskAssigneeMap.get(taskId);

    if (assigneeId) {
      this.createNotification(assigneeId, `The status of task ${taskId} has changed to ${newStatus}.`);
    }
  }

  private handleProjectMemberAdded(event: Event): void {
    const payload = event.payload as ProjectMemberAddedEvent;
    const { projectId, userId } = payload;
    this.createNotification(userId, `You have been added to project ${projectId}.`);
  }

  public getNotificationsByUserId(userId: UserId): Notification[] {
    return Array.from(this.notifications.values()).filter(notif => notif.userId === userId);
  }

  public markNotificationAsRead(id: NotificationId): Notification | undefined {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      return notification;
    }
    return undefined;
  }

  public getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }
}
