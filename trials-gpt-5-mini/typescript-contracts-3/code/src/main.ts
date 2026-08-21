import { createRouter } from "./router";
import { TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload } from "./types";

(async function main() {
  const { server, services, eventBus } = createRouter();
  const { userService, projectService, taskService, commentService, notificationService } = services;

  // Wire event handlers per spec
  // task.assigned -> notification
  eventBus.subscribe("task.assigned", (payload) => {
    const p = payload as TaskAssignedPayload;
    // create notification for assignee
    const message = `Task '${p.taskTitle}' assigned to you`;
    notificationService.createNotification(p.assigneeId, message);
  });

  eventBus.subscribe("task.statusChanged", (payload) => {
    const p = payload as TaskStatusChangedPayload;
    const message = `Task '${p.taskTitle}' status changed to ${p.newStatus}`;
    if (p.assigneeId) notificationService.createNotification(p.assigneeId, message);
  });

  // comment.added -> create notification for task assignee about new comment
  eventBus.subscribe("comment.added", (payload) => {
    const p = payload as CommentAddedPayload;
    try {
      const task = taskService.getById(p.taskId);
      const author = userService.getById(p.authorId);
      const message = `New comment on '${task.title}' by ${author.name}`;
      if (task.assigneeId) notificationService.createNotification(task.assigneeId, message);
    } catch (e) {
      // ignore lookup failures
    }
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
})();
