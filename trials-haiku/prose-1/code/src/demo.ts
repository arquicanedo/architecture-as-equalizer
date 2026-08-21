/**
 * Demo script - Exercises all system features
 */

import { userService } from './user-service';
import { projectService } from './project-service';
import { taskService } from './task-service';
import { commentService } from './comment-service';
import { notificationService } from './notification-service';

async function runDemo(): Promise<void> {
  console.log('=== Task Management API Demo ===\n');

  // Create users
  console.log('1. Creating users...');
  const alice = userService.createUser('Alice', 'alice@example.com');
  const bob = userService.createUser('Bob', 'bob@example.com');
  const charlie = userService.createUser('Charlie', 'charlie@example.com');
  console.log(`   Created users: ${alice.name}, ${bob.name}, ${charlie.name}\n`);

  // Create project
  console.log('2. Creating project...');
  const project = projectService.createProject(
    'Website Redesign',
    'Redesign company website'
  );
  console.log(`   Created project: ${project.name}\n`);

  // Add members to project
  console.log('3. Adding members to project...');
  projectService.addMember(project.id, alice.id);
  projectService.addMember(project.id, bob.id);
  projectService.addMember(project.id, charlie.id);
  console.log(`   Added ${project.members.length} members to project\n`);

  // Create tasks
  console.log('4. Creating tasks...');
  const task1 = taskService.createTask(project.id, 'Design homepage', 'Create mockups for new homepage');
  const task2 = taskService.createTask(project.id, 'Implement authentication', 'Set up login system');
  const task3 = taskService.createTask(project.id, 'Write documentation', 'Complete API documentation');
  console.log(`   Created tasks: ${task1?.title}, ${task2?.title}, ${task3?.title}\n`);

  // Assign tasks
  console.log('5. Assigning tasks...');
  taskService.assignTask(task1!.id, alice.id);
  console.log(`   Assigned "${task1?.title}" to ${alice.name}`);
  taskService.assignTask(task2!.id, bob.id);
  console.log(`   Assigned "${task2?.title}" to ${bob.name}`);
  taskService.assignTask(task3!.id, charlie.id);
  console.log(`   Assigned "${task3?.title}" to ${charlie.name}\n`);

  // Add comments
  console.log('6. Adding comments to tasks...');
  commentService.addComment(task1!.id, bob.id, 'Great mockups! Can we add dark mode?');
  console.log(`   ${bob.name} commented on "${task1?.title}"`);
  commentService.addComment(task2!.id, alice.id, 'Looking good so far.');
  console.log(`   ${alice.name} commented on "${task2?.title}"`);

  // Get notifications for assigned users
  console.log('\n7. Checking notifications...');
  const aliceNotifs = notificationService.getNotificationsByUser(alice.id);
  const bobNotifs = notificationService.getNotificationsByUser(bob.id);
  const charlieNotifs = notificationService.getNotificationsByUser(charlie.id);

  console.log(`   ${alice.name}'s notifications (${aliceNotifs.length}):`);
  aliceNotifs.forEach((n) => console.log(`     - ${n.message}`));

  console.log(`   ${bob.name}'s notifications (${bobNotifs.length}):`);
  bobNotifs.forEach((n) => console.log(`     - ${n.message}`));

  console.log(`   ${charlie.name}'s notifications (${charlieNotifs.length}):`);
  charlieNotifs.forEach((n) => console.log(`     - ${n.message}\n`));

  // Update task status
  console.log('8. Updating task status...');
  taskService.updateStatus(task1!.id, 'in-progress');
  console.log(`   Changed "${task1?.title}" status to "in-progress"`);
  taskService.updateStatus(task1!.id, 'done');
  console.log(`   Changed "${task1?.title}" status to "done"\n`);

  // Check updated notifications
  console.log('9. Notifications after status update...');
  const aliceNotifs2 = notificationService.getNotificationsByUser(alice.id);
  console.log(`   ${alice.name} now has ${aliceNotifs2.length} notifications`);
  aliceNotifs2.slice(-2).forEach((n) => console.log(`     - ${n.message}\n`));

  // Mark notification as read
  console.log('10. Marking notification as read...');
  if (aliceNotifs2.length > 0) {
    notificationService.markAsRead(aliceNotifs2[0].id);
    console.log(`   Marked notification as read: ${aliceNotifs2[0].message}\n`);
  }

  // Display final state
  console.log('=== Final System State ===\n');
  console.log(`Users: ${userService.getAllUsers().length}`);
  console.log(`Projects: ${projectService.getAllProjects().length}`);
  console.log(`Tasks: ${taskService.getAllTasks().length}`);
  console.log(`Comments: ${commentService.getAllComments().length}`);
  console.log(`Notifications: ${notificationService.getAllNotifications().length}\n`);

  console.log('=== Demo Complete ===');
}

// Run the demo
runDemo().catch((error: unknown) => {
  console.error('Demo error:', error);
  process.exit(1);
});
