// ============================================================
// Notification Service Implementation
// ============================================================

import { Notification } from "../types.js";
import { randomUUID } from "crypto";

interface INotificationService {
  getByUser(userId: string): Notification[];
  markAsRead(notificationId: string): Notification;
}

class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification with id ${notificationId} not found`);
    }
    notification.read = true;
    return notification;
  }

  createNotification(userId: string, message: string): Notification {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, notification);
    return notification;
  }
}

export { INotificationService, NotificationService };
