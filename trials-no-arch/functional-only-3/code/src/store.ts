import { randomUUID } from "crypto";
import type { User, Project, Task, Comment, Notification, NotificationEvent } from "./types.js";

// ─── In-memory collections ────────────────────────────────────────────────────

export const users = new Map<string, User>();
export const projects = new Map<string, Project>();
export const tasks = new Map<string, Task>();
export const comments = new Map<string, Comment>();
export const notifications = new Map<string, Notification>();

// ─── ID generation ────────────────────────────────────────────────────────────

export function newId(): string {
  return randomUUID();
}

// ─── Notification helpers ─────────────────────────────────────────────────────

export function createNotification(
  userId: string,
  message: string,
  event: NotificationEvent
): Notification {
  const notification: Notification = {
    id: newId(),
    userId,
    message,
    event,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.set(notification.id, notification);
  return notification;
}

/**
 * Notify all members of a project except the actor.
 */
export function notifyProjectMembers(
  projectId: string,
  actorId: string | null,
  message: string,
  event: NotificationEvent
): void {
  const project = projects.get(projectId);
  if (!project) return;
  for (const memberId of project.memberIds) {
    if (memberId !== actorId) {
      createNotification(memberId, message, event);
    }
  }
}
