/**
 * Demo script: Tests the entire system
 * Flow: create users → create project → add members → create tasks → 
 *       assign tasks → change status → add comments → check notifications
 */

import { createServer } from 'http';
import { handleRequest } from './router';

const PORT = 3001;

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
}

async function request(options: RequestOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = require('http').request(
      {
        hostname: 'localhost',
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }
    );

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function runDemo(): Promise<void> {
  // Start server
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    await handleRequest(req, res);
  });

  server.listen(PORT, async () => {
    console.log('='.repeat(70));
    console.log('Task Management API - Demo');
    console.log('='.repeat(70));
    console.log();

    try {
      // Step 1: Create users
      console.log('Step 1: Creating users...');
      const user1 = await request({
        method: 'POST',
        path: '/users',
        body: { name: 'Alice', email: 'alice@example.com' },
      });
      console.log(`✓ Created user: ${user1.name} (${user1.id})`);

      const user2 = await request({
        method: 'POST',
        path: '/users',
        body: { name: 'Bob', email: 'bob@example.com' },
      });
      console.log(`✓ Created user: ${user2.name} (${user2.id})`);

      const user3 = await request({
        method: 'POST',
        path: '/users',
        body: { name: 'Charlie', email: 'charlie@example.com' },
      });
      console.log(`✓ Created user: ${user3.name} (${user3.id})`);
      console.log();

      // Step 2: Create project
      console.log('Step 2: Creating project...');
      const project = await request({
        method: 'POST',
        path: '/projects',
        body: {
          name: 'Website Redesign',
          description: 'Redesign the company website',
        },
      });
      console.log(`✓ Created project: ${project.name} (${project.id})`);
      console.log();

      // Step 3: Add members to project
      console.log('Step 3: Adding members to project...');
      await request({
        method: 'POST',
        path: `/projects/${project.id}/members`,
        body: { userId: user1.id },
      });
      console.log(`✓ Added ${user1.name} to project`);

      await request({
        method: 'POST',
        path: `/projects/${project.id}/members`,
        body: { userId: user2.id },
      });
      console.log(`✓ Added ${user2.name} to project`);

      await request({
        method: 'POST',
        path: `/projects/${project.id}/members`,
        body: { userId: user3.id },
      });
      console.log(`✓ Added ${user3.name} to project`);
      console.log();

      // Step 4: Create tasks
      console.log('Step 4: Creating tasks...');
      const task1 = await request({
        method: 'POST',
        path: '/tasks',
        body: {
          title: 'Design mockups',
          description: 'Create UI mockups for new design',
          projectId: project.id,
        },
      });
      console.log(`✓ Created task: ${task1.title} (${task1.id})`);

      const task2 = await request({
        method: 'POST',
        path: '/tasks',
        body: {
          title: 'Implement frontend',
          description: 'Build HTML/CSS/JS components',
          projectId: project.id,
        },
      });
      console.log(`✓ Created task: ${task2.title} (${task2.id})`);

      const task3 = await request({
        method: 'POST',
        path: '/tasks',
        body: {
          title: 'Review and test',
          description: 'QA and testing of all features',
          projectId: project.id,
        },
      });
      console.log(`✓ Created task: ${task3.title} (${task3.id})`);
      console.log();

      // Step 5: Assign tasks
      console.log('Step 5: Assigning tasks...');
      await request({
        method: 'PUT',
        path: `/tasks/${task1.id}/assign`,
        body: { assigneeId: user1.id },
      });
      console.log(`✓ Assigned "${task1.title}" to ${user1.name}`);

      await request({
        method: 'PUT',
        path: `/tasks/${task2.id}/assign`,
        body: { assigneeId: user2.id },
      });
      console.log(`✓ Assigned "${task2.title}" to ${user2.name}`);

      await request({
        method: 'PUT',
        path: `/tasks/${task3.id}/assign`,
        body: { assigneeId: user3.id },
      });
      console.log(`✓ Assigned "${task3.title}" to ${user3.name}`);
      console.log();

      // Step 6: Change task statuses
      console.log('Step 6: Changing task statuses...');
      await request({
        method: 'PUT',
        path: `/tasks/${task1.id}/status`,
        body: { status: 'in-progress' },
      });
      console.log(`✓ Changed "${task1.title}" status to in-progress`);

      await request({
        method: 'PUT',
        path: `/tasks/${task1.id}/status`,
        body: { status: 'done' },
      });
      console.log(`✓ Changed "${task1.title}" status to done`);

      await request({
        method: 'PUT',
        path: `/tasks/${task2.id}/status`,
        body: { status: 'in-progress' },
      });
      console.log(`✓ Changed "${task2.title}" status to in-progress`);
      console.log();

      // Step 7: Add comments
      console.log('Step 7: Adding comments...');
      const comment1 = await request({
        method: 'POST',
        path: '/comments',
        body: {
          taskId: task1.id,
          authorId: user1.id,
          body: 'I have completed the design mockups. Please review.',
        },
      });
      console.log(
        `✓ ${user1.name} commented on "${task1.title}": "${comment1.body.substring(0, 40)}..."`
      );

      const comment2 = await request({
        method: 'POST',
        path: '/comments',
        body: {
          taskId: task2.id,
          authorId: user2.id,
          body: 'Working on the implementation now. Will update progress tomorrow.',
        },
      });
      console.log(
        `✓ ${user2.name} commented on "${task2.title}": "${comment2.body.substring(0, 40)}..."`
      );
      console.log();

      // Step 8: Check notifications
      console.log('Step 8: Checking notifications...');
      const notif1 = await request({
        method: 'GET',
        path: `/notifications?userId=${user1.id}`,
      });
      console.log(`✓ ${user1.name} has ${notif1.length} notifications:`);
      notif1.slice(0, 3).forEach((n: any, i: number) => {
        console.log(`  ${i + 1}. ${n.message} [${n.read ? 'read' : 'unread'}]`);
      });

      const notif2 = await request({
        method: 'GET',
        path: `/notifications?userId=${user2.id}`,
      });
      console.log(`✓ ${user2.name} has ${notif2.length} notifications:`);
      notif2.slice(0, 3).forEach((n: any, i: number) => {
        console.log(`  ${i + 1}. ${n.message} [${n.read ? 'read' : 'unread'}]`);
      });

      const notif3 = await request({
        method: 'GET',
        path: `/notifications?userId=${user3.id}`,
      });
      console.log(`✓ ${user3.name} has ${notif3.length} notifications:`);
      notif3.slice(0, 3).forEach((n: any, i: number) => {
        console.log(`  ${i + 1}. ${n.message} [${n.read ? 'read' : 'unread'}]`);
      });
      console.log();

      // Step 9: Mark notifications as read
      console.log('Step 9: Marking notifications as read...');
      if (notif1.length > 0) {
        await request({
          method: 'PUT',
          path: `/notifications/${notif1[0].id}/read`,
        });
        console.log(`✓ Marked notification for ${user1.name} as read`);
      }
      console.log();

      // Step 10: Verify system state
      console.log('Step 10: Verifying system state...');
      const allUsers = await request({
        method: 'GET',
        path: '/users',
      });
      console.log(`✓ Total users: ${allUsers.length}`);

      const allProjects = await request({
        method: 'GET',
        path: '/projects',
      });
      console.log(`✓ Total projects: ${allProjects.length}`);

      const allTasks = await request({
        method: 'GET',
        path: '/tasks',
      });
      console.log(`✓ Total tasks: ${allTasks.length}`);

      const projectTasks = await request({
        method: 'GET',
        path: `/tasks?projectId=${project.id}`,
      });
      console.log(`✓ Tasks in "${project.name}": ${projectTasks.length}`);

      const taskComments = await request({
        method: 'GET',
        path: `/comments?taskId=${task1.id}`,
      });
      console.log(`✓ Comments on "${task1.title}": ${taskComments.length}`);
      console.log();

      console.log('='.repeat(70));
      console.log('Demo completed successfully!');
      console.log('='.repeat(70));
    } catch (error) {
      console.error('Demo error:', error);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runDemo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
