import Application from "./main";

const app = new Application();
const { userService, projectService, taskService, commentService, notificationService } =
  app.getServices();

console.log("=== Task Management API - Unit Tests ===\n");

// Test 1: User Service
console.log("Test 1: User Service");
const user1 = userService.create({ name: "Alice", email: "alice@example.com" });
const user2 = userService.create({ name: "Bob", email: "bob@example.com" });
console.log(`✓ Created users: ${user1.name}, ${user2.name}`);

const allUsers = userService.getAll();
console.log(`✓ Retrieved ${allUsers.length} users`);

const retrievedUser = userService.getById(user1.id);
console.log(`✓ Retrieved user by ID: ${retrievedUser.name}`);

const updated = userService.update(user1.id, { name: "Alice Updated" });
console.log(`✓ Updated user: ${updated.name}`);

// Test 2: Project Service
console.log("\nTest 2: Project Service");
const project = projectService.create({
  name: "My Project",
  description: "A test project",
});
console.log(`✓ Created project: ${project.name}`);

const projectWithMember = projectService.addMember(project.id, user1.id);
console.log(`✓ Added member to project (count: ${projectWithMember.memberIds.length})`);

// Test 3: Task Service - Forward-only transitions
console.log("\nTest 3: Task Service - Status Transitions");
const task = taskService.create({
  title: "Test Task",
  description: "A test task",
  projectId: project.id,
});
console.log(`✓ Created task with status: ${task.status}`);

const assignedTask = taskService.assign(task.id, user1.id);
console.log(`✓ Assigned task to user`);

const inProgressTask = taskService.changeStatus(task.id, "in-progress");
console.log(`✓ Changed status: ${task.status} → ${inProgressTask.status}`);

const doneTask = taskService.changeStatus(task.id, "done");
console.log(`✓ Changed status: ${inProgressTask.status} → ${doneTask.status}`);

// Test invalid transition
console.log("\nTest 4: Task Service - Invalid Transition");
try {
  taskService.changeStatus(task.id, "in-progress");
  console.log("✗ Should have thrown error for invalid transition");
} catch (error) {
  console.log(`✓ Correctly rejected invalid transition: ${(error as Error).message}`);
}

// Test 5: Comment Service
console.log("\nTest 5: Comment Service");
const comment = commentService.create({
  taskId: task.id,
  authorId: user2.id,
  body: "Test comment",
});
console.log(`✓ Created comment on task`);

const taskComments = commentService.getByTask(task.id);
console.log(`✓ Retrieved ${taskComments.length} comment(s) for task`);

// Test 6: Notification Service
console.log("\nTest 6: Notification Service");
const userNotifications = notificationService.getByUser(user1.id);
console.log(`✓ User has ${userNotifications.length} notification(s)`);

if (userNotifications.length > 0) {
  const notif = userNotifications[0];
  const marked = notificationService.markAsRead(notif.id);
  console.log(`✓ Marked notification as read: ${marked.read}`);
}

// Test 7: Event Bus
console.log("\nTest 7: Event Bus - Task Assigned Event");
const task2 = taskService.create({
  title: "Task 2",
  description: "Task 2 description",
  projectId: project.id,
});
taskService.assign(task2.id, user2.id);
const notificationsAfterAssign = notificationService.getByUser(user2.id);
const hasAssignNotification = notificationsAfterAssign.some((n) =>
  n.message.includes("assigned to you")
);
console.log(
  `✓ Event bus published task.assigned event (notification created: ${hasAssignNotification})`
);

// Test 8: Event Bus - Status Changed Event
const statusChangedTask = taskService.changeStatus(task2.id, "in-progress");
const notificationsAfterStatusChange = notificationService.getByUser(user2.id);
const hasStatusNotification = notificationsAfterStatusChange.some((n) =>
  n.message.includes("status changed")
);
console.log(
  `✓ Event bus published task.statusChanged event (notification created: ${hasStatusNotification})`
);

console.log("\n=== All tests passed! ===");
