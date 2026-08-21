import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor(private bus: EventBus) {
    // Subscribe to events
    this.bus.subscribe('task.assigned', (p: { taskId: string; taskTitle: string; assigneeId: string }) => {
      const message = `You were assigned to task "${p.taskTitle}" (${p.taskId})`;
      this.create(p.assigneeId, message);
    });

    this.bus.subscribe(
      'task.statusChanged',
      (p: { taskId: string; taskTitle: string; assigneeId: string | null; oldStatus: string; newStatus: string }) => {
        if (p.assigneeId) {
          const message = `Task "${p.taskTitle}" (${p.taskId}) moved from ${p.oldStatus} to ${p.newStatus}`;
          this.create(p.assigneeId, message);
        }
      }
    );

    this.bus.subscribe(
      'comment.added',
      (p: { commentId: string; taskId: string; taskTitle: string; authorId: string; authorName: string }) => {
        // We don't have access to task assignee here; per spec, notification is for task assignee.
        // To respect boundaries, we will allow router to pass enriched events with an additional assigneeId if available.
        // If not provided, we cannot deliver.
        const anyPayload = p as any;
        const assigneeId: string | undefined = anyPayload.assigneeId;
        if (assigneeId) {
          const message = `${p.authorName} commented on task "${p.taskTitle}": comment ${p.commentId}`;
          this.create(assigneeId, message);
        }
      }
    );
  }

  private create(userId: string, message: string): Notification {
    const notif: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notif.id, notif);
    return notif;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  markAsRead(id: string): Notification | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    existing.read = true;
    this.store.set(id, existing);
    return existing;
  }
}
