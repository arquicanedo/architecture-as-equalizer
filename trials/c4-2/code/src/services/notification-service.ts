/**
 * Notification Service — creates notifications from events.
 * Owns the in-memory Notification store.
 * Publishes: none
 * Subscribes: task.assigned, task.statusChanged, comment.added
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus";
import { TaskAssignedPayload, TaskStatusChangedPayload } from "./task-service";
import { CommentAddedPayload } from "./comment-service";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor(eventBus: EventBus) {
    // Subscribe to task.assigned
    eventBus.subscribe("task.assigned", (payload) => {
      const p = payload as TaskAssignedPayload;
      this.createNotification(
        p.assigneeId,
        `You have been assigned to task "${p.taskTitle}".`
      );
    });

    // Subscribe to task.statusChanged
    eventBus.subscribe("task.statusChanged", (payload) => {
      const p = payload as TaskStatusChangedPayload;
      if (p.assigneeId) {
        this.createNotification(
          p.assigneeId,
          `Task "${p.taskTitle}" status changed from "${p.oldStatus}" to "${p.newStatus}".`
        );
      }
    });

    // Subscribe to comment.added
    eventBus.subscribe("comment.added", (payload) => {
      const p = payload as CommentAddedPayload;

      // Notify the task assignee (if there is one and they are not the commenter)
      if (p.taskAssigneeId && p.taskAssigneeId !== p.authorId) {
        this.createNotification(
          p.taskAssigneeId,
          `${p.authorName} commented on task "${p.taskTitle}": "${p.body}"`
        );
      }

      // Notify the comment author that their comment was posted
      this.createNotification(
        p.authorId,
        `Your comment on task "${p.taskTitle}" was posted.`
      );
    });
  }

  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification {
    const notification = this.store.get(id);
    if (!notification) throw new Error(`Notification not found: ${id}`);
    notification.read = true;
    this.store.set(id, notification);
    return notification;
  }
}
