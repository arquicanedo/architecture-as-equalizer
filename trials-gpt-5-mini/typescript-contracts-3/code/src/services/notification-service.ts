import { Notification, INotificationService } from "../types";
import { randomUUID } from "crypto";

export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();

  // helper method used by main to create notifications in response to events
  createNotification(userId: string, message: string): Notification {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const n: Notification = { id, userId, message, read: false, createdAt };
    this.notifications.set(id, n);
    return n;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  markAsRead(notificationId: string): Notification {
    const n = this.notifications.get(notificationId);
    if (!n) throw new Error("Notification not found");
    const updated = { ...n, read: true };
    this.notifications.set(notificationId, updated);
    return updated;
  }
}
