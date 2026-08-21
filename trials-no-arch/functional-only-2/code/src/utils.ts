import { randomUUID } from "crypto";
import { store } from "./store";
import { Notification } from "./types";

export function generateId(): string {
  return randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function createNotification(userId: string, message: string): void {
  const notification: Notification = {
    id: generateId(),
    userId,
    message,
    read: false,
    createdAt: now(),
  };
  store.notifications.set(notification.id, notification);
}
