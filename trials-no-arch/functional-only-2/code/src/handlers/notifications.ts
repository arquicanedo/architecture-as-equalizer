import { ParsedRequest, ResponseHelper } from "../types";
import { store } from "../store";

// GET /notifications  (optional query: ?userId=xxx)
export function listNotifications(
  req: ParsedRequest,
  res: ResponseHelper
): void {
  let notifications = Array.from(store.notifications.values());
  const { userId } = req.query;
  if (userId) {
    notifications = notifications.filter((n) => n.userId === userId);
  }
  res.json(200, notifications);
}

// PUT /notifications/:id/read
export function markNotificationRead(
  req: ParsedRequest,
  res: ResponseHelper
): void {
  const id = req.segments[1];
  const notification = store.notifications.get(id);
  if (!notification) {
    res.error(404, `Notification '${id}' not found`);
    return;
  }
  notification.read = true;
  store.notifications.set(id, notification);
  res.json(200, notification);
}
