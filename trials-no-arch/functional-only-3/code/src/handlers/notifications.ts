import { notifications } from "../store.js";
import type { RouteHandler } from "../types.js";

// ─── GET /notifications ───────────────────────────────────────────────────────

export const listNotifications: RouteHandler = async (req) => {
  const { userId } = req.query;
  let result = Array.from(notifications.values());
  if (userId) {
    result = result.filter((n) => n.userId === userId);
  }
  // Sort newest first
  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { status: 200, body: result };
};

// ─── PUT /notifications/:id/read ─────────────────────────────────────────────

export const markNotificationRead: RouteHandler = async (req) => {
  const notification = notifications.get(req.query["id"]);
  if (!notification) return { status: 404, body: { error: "Notification not found" } };

  notification.read = true;
  notifications.set(notification.id, notification);
  return { status: 200, body: notification };
};
