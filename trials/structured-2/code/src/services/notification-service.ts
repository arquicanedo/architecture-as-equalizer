/**
 * Notification Service
 * Owns the notification data store exclusively.
 * Data shape: { id, userId, message, read, createdAt }
 *
 * Subscribes to:
 *   task.assigned       → creates notification for assignee
 *   task.statusChanged  → creates notification for assignee
 *   comment.added       → creates notification for task assignee
 *                         (assigneeId is embedded in the event payload)
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor(private eventBus: EventBus) {
    this.registerSubscriptions();
  }

  private registerSubscriptions(): void {
    this.eventBus.subscribe("task.assigned", (payload) => {
      const { taskId, taskTitle, assigneeId } = payload as {
        taskId: string;
        taskTitle: string;
        assigneeId: string;
      };
      this.createNotification(
        assigneeId,
        `You have been assigned to task "${taskTitle}" (${taskId}).`
      );
    });

    this.eventBus.subscribe("task.statusChanged", (payload) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } =
        payload as {
          taskId: string;
          taskTitle: string;
          assigneeId: string | null;
          oldStatus: string;
          newStatus: string;
        };
      if (!assigneeId) return; // no assignee — nobody to notify
      this.createNotification(
        assigneeId,
        `Task "${taskTitle}" (${taskId}) status changed from "${oldStatus}" to "${newStatus}".`
      );
    });

    this.eventBus.subscribe("comment.added", (payload) => {
      const { commentId, taskId, taskTitle, authorId, authorName } =
        payload as {
          commentId: string;
          taskId: string;
          taskTitle: string;
          authorId: string;
          authorName: string;
          /** Provided by the router so the notification service doesn't need
           *  to call the task service directly. */
          assigneeId?: string | null;
        };

      // The router embeds assigneeId in the comment.added payload so we
      // can notify the task's assignee without reaching into another service.
      const assigneeId = (payload as any).assigneeId as string | null | undefined;
      if (!assigneeId) return;

      this.createNotification(
        assigneeId,
        `${authorName} commented on task "${taskTitle}" (${taskId}): "${payload.body ?? "…"}".`
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
    return Array.from(this.store.values()).filter(
      (n) => n.userId === userId
    );
  }

  markAsRead(id: string): Notification {
    const notification = this.store.get(id);
    if (!notification) throw new Error(`Notification not found: ${id}`);
    notification.read = true;
    this.store.set(id, notification);
    return notification;
  }
}
