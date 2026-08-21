// ============================================================
// Notification Service
// ============================================================

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

export interface INotificationService {
  getByUser(userId: string): Notification[];
  markAsRead(notificationId: string): Notification;
}

export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();
  private nextId = 1;

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }

  // Internal method for creating notifications (called by event handlers)
  createNotification(userId: string, message: string): Notification {
    const id = `notification-${this.nextId++}`;
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
