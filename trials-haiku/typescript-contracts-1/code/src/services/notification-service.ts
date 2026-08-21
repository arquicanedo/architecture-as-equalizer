import { Notification, INotificationService } from "../types";
import { randomBytes } from "crypto";

export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: this.generateId(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId
    );
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    notification.read = true;
    return notification;
  }
}
