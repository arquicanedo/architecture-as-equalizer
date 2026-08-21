import * as store from '../store.js';
import { ok, notFound } from '../helpers.js';
import type { RouteContext, RouteResponse } from '../types.js';

// ─── GET /notifications ──────────────────────────────────────────────────────

export function listNotifications(ctx: RouteContext): RouteResponse {
  let all = Array.from(store.notifications.values());

  // Optional filter: ?userId=...
  const { userId } = ctx.req.query;
  if (userId) {
    all = all.filter(n => n.userId === userId);
  }

  return ok(all);
}

// ─── PUT /notifications/:id/read ─────────────────────────────────────────────

export function markNotificationRead(ctx: RouteContext): RouteResponse {
  const notification = store.notifications.get(ctx.params.id);
  if (!notification) return notFound(`Notification "${ctx.params.id}" not found`);

  const updated = { ...notification, read: true };
  store.notifications.set(notification.id, updated);
  return ok(updated);
}
