import { randomUUID } from 'crypto';
import type { User, Project, Task, Comment, Notification } from './types.js';

// ─── In-Memory Collections ────────────────────────────────────────────────────

export const users = new Map<string, User>();
export const projects = new Map<string, Project>();
export const tasks = new Map<string, Task>();
export const comments = new Map<string, Comment>();
export const notifications = new Map<string, Notification>();

// ─── ID Generation ───────────────────────────────────────────────────────────

export function newId(): string {
  return randomUUID();
}

// ─── Timestamp Helper ────────────────────────────────────────────────────────

export function now(): string {
  return new Date().toISOString();
}

// ─── Notification Factory ────────────────────────────────────────────────────

export function createNotification(userId: string, message: string): Notification {
  const notification: Notification = {
    id: newId(),
    userId,
    message,
    read: false,
    createdAt: now(),
  };
  notifications.set(notification.id, notification);
  return notification;
}
