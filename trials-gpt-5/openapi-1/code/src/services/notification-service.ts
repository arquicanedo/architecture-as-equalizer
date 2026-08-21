import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';
import { Notification, UUID } from '../types';

export class NotificationService {
  private notifications: Map<UUID, Notification> = new Map();

  constructor(eventBus: EventBus) {
    eventBus.subscribe('task.assigned', (payload: any) => {
      const { taskTitle, assigneeId } = payload as { taskTitle: string; assigneeId: UUID };
      if (!assigneeId) return;
      this.create(assigneeId, `Task '${taskTitle}' was assigned to you.`);
    });

    eventBus.subscribe('task.statusChanged', (payload: any) => {
      const { taskTitle, assigneeId, oldStatus, newStatus } = payload as { taskTitle: string; assigneeId?: UUID | null; oldStatus: string; newStatus: string };
      if (assigneeId) {
        this.create(assigneeId, `Task '${taskTitle}' status changed: ${oldStatus} → ${newStatus}.`);
      }
    });

    eventBus.subscribe('comment.added', (payload: any) => {
      const { taskTitle, authorId, authorName } = payload as { taskTitle: string; authorId: UUID; authorName: string };
      // Minimalistic: notify the author that their comment was recorded
      this.create(authorId, `${authorName}, your comment was added to task '${taskTitle}'.`);
    });
  }

  private create(userId: UUID, message: string): Notification {
    const n: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(n.id, n);
    return n;
  }

  listByUser(userId: UUID): Notification[] {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  markRead(id: UUID): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    this.notifications.set(id, n);
    return n;
  }
}
