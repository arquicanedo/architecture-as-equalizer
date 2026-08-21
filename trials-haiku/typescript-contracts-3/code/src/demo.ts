// ============================================================
// Demo Script — End-to-End Workflow
// ============================================================

import { createServer } from "http";
import { EventBus } from "./event-bus.js";
import { UserService } from "./services/user-service.js";
import { ProjectService } from "./services/project-service.js";
import { TaskService } from "./services/task-service.js";
import { CommentService } from "./services/comment-service.js";
import { NotificationService } from "./services/notification-service.js";
import { Router } from "./router.js";
import { TaskAssignedPayload, TaskStatusChangedPayload } from "./services/task-service.js";
import { CommentAddedPayload } from "./services/comment-service.js";

// Initialize Event Bus and Services
const eventBus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService();

// Setup event subscriptions
eventBus.subscribe("task.assigned", (payload: unknown) => {
  const p = payload as TaskAssignedPayload;
  notificationService.createNotification(
    p.assigneeId,
    `Task '${p.taskTitle}' assigned to you`
  );
});

eventBus.subscribe("task.statusChanged", (payload: unknown) => {
  const p = payload as TaskStatusChangedPayload;
  if (p.assigneeId) {
    notificationService.createNotification(
      p.assigneeId,
      `Task '${p.taskTitle}' status changed to ${p.newStatus}`
    );
  }
});

eventBus.subscribe("comment.added", (payload: unknown) => {
  const p = payload as CommentAddedPayload;
  try {
    const task = taskService.getById(p.taskId);
    if (task.assigneeId && task.assigneeId !== p.authorId) {
      notificationService.createNotification(
        task.assigneeId,
        `${p.authorName} commented on task '${p.taskTitle}'`
      );
    }
  } catch {
    // Task not found, skip notification
  }
});

// Initialize Router
const router = new Router({
  userService,
  projectService,
  taskService,
  commentService,
  notificationService,
});

// ============================================================
// Demo: End-to-End Workflow
// ============================================================

async function runDemo(): Promise<void> {
  console.log("\n=== TASK MANAGEMENT API DEMO ===\n");

  // 1. Create Users
  console.log("1. Creating users...");
  const alice = userService.create({ name: "Alice", email: "alice@example.com" });
  const bob = userService.create({ name: "Bob", email: "bob@example.com" });
  const charlie = userService.create({ name: "Charlie", email: "charlie@example.com" });
  console.log(`   ✓ Created users: ${alice.name}, ${bob.name}, ${charlie.name}\n`);

  // 2. Create Project
  console.log("2. Creating project...");
  const project = projectService.create({
    name: "Website Redesign",
    description: "Redesign company website",
  });
  console.log(`   ✓ Created project: ${project.name}\n`);

  // 3. Add Members to Project
  console.log("3. Adding members to project...");
  projectService.addMember(project.id, alice.id);
  projectService.addMember(project.id, bob.id);
  projectService.addMember(project.id, charlie.id);
  console.log(
    `   ✓ Added ${alice.name}, ${bob.name}, ${charlie.name} to project\n`
  );

  // 4. Create Tasks
  console.log("4. Creating tasks...");
  const task1 = taskService.create({
    title: "Design homepage mockup",
    description: "Create initial design for homepage",
    projectId: project.id,
  });
  const task2 = taskService.create({
    title: "Implement header component",
    description: "Build responsive header",
    projectId: project.id,
  });
  const task3 = taskService.create({
    title: "Write documentation",
    description: "Document the API",
    projectId: project.id,
  });
  console.log(`   ✓ Created 3 tasks\n`);

  // 5. Assign Tasks
  console.log("5. Assigning tasks...");
  taskService.assign(task1.id, alice.id);
  console.log(`   ✓ Assigned '${task1.title}' to ${alice.name}`);
  taskService.assign(task2.id, bob.id);
  console.log(`   ✓ Assigned '${task2.title}' to ${bob.name}`);
  taskService.assign(task3.id, charlie.id);
  console.log(`   ✓ Assigned '${task3.title}' to ${charlie.name}\n`);

  // 6. Change Task Statuses
  console.log("6. Changing task statuses...");
  taskService.changeStatus(task1.id, "in-progress");
  console.log(`   ✓ Task 1: todo → in-progress`);
  taskService.changeStatus(task1.id, "done");
  console.log(`   ✓ Task 1: in-progress → done`);
  taskService.changeStatus(task2.id, "in-progress");
  console.log(`   ✓ Task 2: todo → in-progress\n`);

  // 7. Add Comments
  console.log("7. Adding comments...");
  const comment1 = commentService.create({
    taskId: task2.id,
    authorId: alice.id,
    body: "Great start! Just needs some refinement.",
  });
  console.log(`   ✓ ${alice.name} commented on task 2`);
  commentService.publishCommentAdded(
    comment1.id,
    task2.id,
    task2.title,
    alice.id,
    alice.name
  );

  const comment2 = commentService.create({
    taskId: task3.id,
    authorId: alice.id,
    body: "Please include API examples.",
  });
  console.log(`   ✓ ${alice.name} commented on task 3`);
  commentService.publishCommentAdded(
    comment2.id,
    task3.id,
    task3.title,
    alice.id,
    alice.name
  );
  console.log();

  // 8. Check Notifications
  console.log("8. Checking notifications...");
  const aliceNotifications = notificationService.getByUser(alice.id);
  const bobNotifications = notificationService.getByUser(bob.id);
  const charlieNotifications = notificationService.getByUser(charlie.id);

  console.log(`   ${alice.name}'s notifications (${aliceNotifications.length}):`);
  aliceNotifications.forEach((n) => {
    console.log(`     - ${n.message}`);
  });

  console.log(`   ${bob.name}'s notifications (${bobNotifications.length}):`);
  bobNotifications.forEach((n) => {
    console.log(`     - ${n.message}`);
  });

  console.log(`   ${charlie.name}'s notifications (${charlieNotifications.length}):`);
  charlieNotifications.forEach((n) => {
    console.log(`     - ${n.message}`);
  });
  console.log();

  // 9. Test Invalid Transition (should fail)
  console.log("9. Testing invalid status transition...");
  try {
    taskService.changeStatus(task3.id, "todo");
    console.log("   ✗ ERROR: Should have thrown an error for backward transition!");
  } catch (error) {
    console.log(`   ✓ Correctly rejected backward transition: ${(error as Error).message}\n`);
  }

  // 10. Test HTTP API via Router (sample request)
  console.log("10. Testing HTTP API...");
  console.log("    Creating a mock HTTP request to GET /users");

  const mockReq = {
    url: "/users",
    method: "GET",
    headers: { host: "localhost:3000" },
  } as any;

  const mockRes = {
    writeHead: (status: number, headers: Record<string, string>) => {
      console.log(`    ✓ Response status: ${status}`);
    },
    end: (data: string) => {
      const users = JSON.parse(data);
      console.log(`    ✓ Retrieved ${users.length} users via HTTP API\n`);
    },
  } as any;

  await router.handle(mockReq, mockRes);

  // 11. Summary
  console.log("=== DEMO COMPLETE ===\n");
  console.log("Summary:");
  console.log(`  • Created ${userService.getAll().length} users`);
  console.log(`  • Created ${projectService.getAll().length} project`);
  console.log(`  • Created ${taskService.getByProject(project.id).length} tasks`);
  console.log(`  • Created ${commentService.getByTask(task2.id).length + commentService.getByTask(task3.id).length} comments`);
  console.log(
    `  • Generated ${aliceNotifications.length + bobNotifications.length + charlieNotifications.length} notifications`
  );
  console.log();
  console.log("To start the server, run: npx tsx src/main.ts\n");
}

// Run the demo
runDemo().catch(console.error);
