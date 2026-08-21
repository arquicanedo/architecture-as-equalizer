import { Notification, INotificationService } from '../types'; // Corrected import path
import * as crypto from 'node:crypto';

export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification>;

  constructor() {
    this.notifications = new Map();
  }

  createNotification(userId: string, message: string): Notification {
    const id = crypto.randomUUID();
    const newNotification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(notification => notification.userId === userId);
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }
}
