/**
 * Demo script - demonstrates all features of the task management API
 */

import { createServer } from 'http';
import { apiRouter } from './api-router.js';
import { notificationService } from './notification-service.js';

const PORT = 3000;

// Helper function to make HTTP requests
function makeRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = require('http').request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDemo() {
  // Start the server
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    await apiRouter.handleRequest(req, res);
  });

  server.listen(PORT, async () => {
    console.log('\n=== Task Management API Demo ===\n');

    try {
      // Create users
      console.log('1. Creating users...');
      const user1Response = await makeRequest('POST', '/users', {
        name: 'Alice Johnson',
        email: 'alice@example.com',
      });
      const user1 = (user1Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Created user: Alice (${user1})`);

      const user2Response = await makeRequest('POST', '/users', {
        name: 'Bob Smith',
        email: 'bob@example.com',
      });
      const user2 = (user2Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Created user: Bob (${user2})`);

      const user3Response = await makeRequest('POST', '/users', {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
      });
      const user3 = (user3Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Created user: Charlie (${user3})`);

      // Get all users
      console.log('\n2. Retrieving all users...');
      const usersResponse = await makeRequest('GET', '/users');
      const users = (usersResponse.data as unknown[]).length;
      console.log(`   ✓ Total users: ${users}`);

      // Create a project
      console.log('\n3. Creating a project...');
      const projectResponse = await makeRequest('POST', '/projects', {
        name: 'Website Redesign',
        description: 'Complete redesign of company website',
        creatorId: user1,
      });
      const projectId = (projectResponse.data as Record<string, unknown>).id;
      console.log(`   ✓ Created project: Website Redesign (${projectId})`);

      // Add members to project
      console.log('\n4. Adding project members...');
      await makeRequest('POST', `/projects/${projectId}/members`, {
        userId: user2,
      });
      console.log(`   ✓ Added Bob to project`);

      await makeRequest('POST', `/projects/${projectId}/members`, {
        userId: user3,
      });
      console.log(`   ✓ Added Charlie to project`);

      // Get project
      console.log('\n5. Retrieving project details...');
      const projDetailsResponse = await makeRequest('GET', `/projects/${projectId}`);
      const projDetails = projDetailsResponse.data as Record<string, unknown>;
      const memberCount = ((projDetails.members as unknown[]) || []).length;
      console.log(`   ✓ Project has ${memberCount} members`);

      // Create tasks
      console.log('\n6. Creating tasks...');
      const task1Response = await makeRequest('POST', '/tasks', {
        projectId,
        title: 'Design homepage mockups',
        description: 'Create high-fidelity mockups for the new homepage',
      });
      const task1 = (task1Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Created task: Design homepage mockups (${task1})`);

      const task2Response = await makeRequest('POST', '/tasks', {
        projectId,
        title: 'Implement responsive layout',
        description: 'Build responsive CSS for all screen sizes',
      });
      const task2 = (task2Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Created task: Implement responsive layout (${task2})`);

      const task3Response = await makeRequest('POST', '/tasks', {
        projectId,
        title: 'Set up CI/CD pipeline',
        description: 'Configure automated testing and deployment',
      });
      const task3 = (task3Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Created task: Set up CI/CD pipeline (${task3})`);

      // Get tasks for project
      console.log('\n7. Retrieving project tasks...');
      const tasksResponse = await makeRequest('GET', `/tasks?projectId=${projectId}`);
      const taskCount = (tasksResponse.data as unknown[]).length;
      console.log(`   ✓ Project has ${taskCount} tasks`);

      // Assign tasks
      console.log('\n8. Assigning tasks to users...');
      await makeRequest('PUT', `/tasks/${task1}/assign`, {
        userId: user2,
      });
      console.log(`   ✓ Assigned task 1 to Bob`);

      await makeRequest('PUT', `/tasks/${task2}/assign`, {
        userId: user3,
      });
      console.log(`   ✓ Assigned task 2 to Charlie`);

      // Change task status
      console.log('\n9. Updating task status...');
      await makeRequest('PUT', `/tasks/${task1}/status`, {
        status: 'in-progress',
      });
      console.log(`   ✓ Moved task 1 to in-progress`);

      // Add comments
      console.log('\n10. Adding comments to tasks...');
      const comment1Response = await makeRequest('POST', '/comments', {
        taskId: task1,
        authorId: user1,
        text: 'Great mockups! A few tweaks needed on the color scheme.',
      });
      const comment1 = (comment1Response.data as Record<string, unknown>).id;
      console.log(`   ✓ Alice commented on task 1`);

      const comment2Response = await makeRequest('POST', '/comments', {
        taskId: task1,
        authorId: user2,
        text: 'Thanks for the feedback, will update the colors.',
      });
      console.log(`   ✓ Bob replied on task 1`);

      // Get comments for task
      console.log('\n11. Retrieving task comments...');
      const commentsResponse = await makeRequest('GET', `/comments?taskId=${task1}`);
      const commentCount = (commentsResponse.data as unknown[]).length;
      console.log(`   ✓ Task 1 has ${commentCount} comments`);

      // Check notifications
      console.log('\n12. Checking notifications...');
      const notificationsResponse = await makeRequest('GET', `/notifications?userId=${user2}`);
      const notifications = notificationsResponse.data as unknown[];
      console.log(`   ✓ Bob has ${notifications.length} notifications`);

      if (notifications.length > 0) {
        console.log('   Notifications:');
        notifications.forEach((notif: any, index: number) => {
          console.log(`     ${index + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.message}`);
        });

        // Mark notification as read
        console.log('\n13. Marking notification as read...');
        const firstNotif = notifications[0] as Record<string, unknown>;
        await makeRequest('PUT', `/notifications/${firstNotif.id}/read`, {});
        console.log(`   ✓ Marked notification as read`);
      }

      // Update user
      console.log('\n14. Updating user information...');
      await makeRequest('PUT', `/users/${user1}`, {
        name: 'Alice Johnson Updated',
        email: 'alice.new@example.com',
      });
      console.log(`   ✓ Updated Alice's profile`);

      // Get user
      console.log('\n15. Retrieving updated user...');
      const userDetailResponse = await makeRequest('GET', `/users/${user1}`);
      const userDetail = userDetailResponse.data as Record<string, unknown>;
      console.log(`   ✓ User name: ${userDetail.name}`);
      console.log(`   ✓ User email: ${userDetail.email}`);

      // Complete a task
      console.log('\n16. Completing a task...');
      await makeRequest('PUT', `/tasks/${task1}/status`, {
        status: 'done',
      });
      console.log(`   ✓ Moved task 1 to done`);

      // Final summary
      console.log('\n=== Demo Complete ===');
      console.log('\nSummary:');
      console.log(`✓ Created ${users} users`);
      console.log(`✓ Created 1 project with 3 members`);
      console.log(`✓ Created ${taskCount} tasks`);
      console.log(`✓ Added comments and generated notifications`);
      console.log(`✓ Demonstrated CRUD operations on all resources`);

      console.log('\n--- Server is still running ---');
      console.log('Try making requests to http://localhost:3000');
      console.log('Examples:');
      console.log('  GET  /users');
      console.log('  GET  /projects');
      console.log('  GET  /tasks?projectId=project-1');
      console.log('  GET  /notifications?userId=user-1');
    } catch (error) {
      console.error('Demo failed:', error);
      server.close();
      process.exit(1);
    }
  });
}

runDemo().catch(error => {
  console.error('Failed to run demo:', error);
  process.exit(1);
});
