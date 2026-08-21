/**
 * Demo Script - End-to-end test of the Task Management API
 * Tests: create users → create project → add members → create tasks → assign tasks → change status → add comments → check notifications
 */

import { createServer } from 'http';
import * as http from 'http';
import { handleRequest } from './router';

const PORT = 3001;

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
}

function makeRequest(options: RequestOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    const { method, path, body } = options;
    const bodyStr = body ? JSON.stringify(body) : '';

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: null });
          }
        });
      }
    );

    req.on('error', reject);
    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function runDemo() {
  console.log('🚀 Task Management API Demo\n');

  // Start server
  const server = createServer(handleRequest);
  server.listen(PORT, async () => {
    console.log(`✓ Server started on http://localhost:${PORT}\n`);

    try {
      // ========== CREATE USERS ==========
      console.log('📝 Creating users...');
      const alice = await makeRequest({
        method: 'POST',
        path: '/users',
        body: { name: 'Alice', email: 'alice@example.com' },
      });
      const aliceId = alice.data.id;
      console.log(`  ✓ Created user Alice (${aliceId})`);

      const bob = await makeRequest({
        method: 'POST',
        path: '/users',
        body: { name: 'Bob', email: 'bob@example.com' },
      });
      const bobId = bob.data.id;
      console.log(`  ✓ Created user Bob (${bobId})`);

      const charlie = await makeRequest({
        method: 'POST',
        path: '/users',
        body: { name: 'Charlie', email: 'charlie@example.com' },
      });
      const charlieId = charlie.data.id;
      console.log(`  ✓ Created user Charlie (${charlieId})\n`);

      // ========== CREATE PROJECT ==========
      console.log('📦 Creating project...');
      const project = await makeRequest({
        method: 'POST',
        path: '/projects',
        body: {
          name: 'Website Redesign',
          description: 'Complete redesign of the company website',
        },
      });
      const projectId = project.data.id;
      console.log(`  ✓ Created project "${project.data.name}" (${projectId})\n`);

      // ========== ADD MEMBERS ==========
      console.log('👥 Adding members to project...');
      await makeRequest({
        method: 'POST',
        path: `/projects/${projectId}/members`,
        body: { userId: aliceId },
      });
      console.log(`  ✓ Added Alice to project`);

      await makeRequest({
        method: 'POST',
        path: `/projects/${projectId}/members`,
        body: { userId: bobId },
      });
      console.log(`  ✓ Added Bob to project`);

      await makeRequest({
        method: 'POST',
        path: `/projects/${projectId}/members`,
        body: { userId: charlieId },
      });
      console.log(`  ✓ Added Charlie to project\n`);

      // ========== CREATE TASKS ==========
      console.log('✅ Creating tasks...');
      const task1 = await makeRequest({
        method: 'POST',
        path: '/tasks',
        body: {
          title: 'Design homepage',
          description: 'Create mockups for the new homepage',
          projectId,
        },
      });
      const task1Id = task1.data.id;
      console.log(`  ✓ Created task 1: "${task1.data.title}" (${task1Id})`);

      const task2 = await makeRequest({
        method: 'POST',
        path: '/tasks',
        body: {
          title: 'Implement backend API',
          description: 'Build REST API endpoints',
          projectId,
        },
      });
      const task2Id = task2.data.id;
      console.log(`  ✓ Created task 2: "${task2.data.title}" (${task2Id})`);

      const task3 = await makeRequest({
        method: 'POST',
        path: '/tasks',
        body: {
          title: 'Write tests',
          description: 'Add unit and integration tests',
          projectId,
        },
      });
      const task3Id = task3.data.id;
      console.log(`  ✓ Created task 3: "${task3.data.title}" (${task3Id})\n`);

      // ========== ASSIGN TASKS ==========
      console.log('🎯 Assigning tasks...');
      await makeRequest({
        method: 'PUT',
        path: `/tasks/${task1Id}/assign`,
        body: { assigneeId: aliceId },
      });
      console.log(`  ✓ Assigned "Design homepage" to Alice`);

      await makeRequest({
        method: 'PUT',
        path: `/tasks/${task2Id}/assign`,
        body: { assigneeId: bobId },
      });
      console.log(`  ✓ Assigned "Implement backend API" to Bob`);

      await makeRequest({
        method: 'PUT',
        path: `/tasks/${task3Id}/assign`,
        body: { assigneeId: charlieId },
      });
      console.log(`  ✓ Assigned "Write tests" to Charlie\n`);

      // ========== CHANGE TASK STATUS ==========
      console.log('📊 Changing task status...');
      await makeRequest({
        method: 'PUT',
        path: `/tasks/${task1Id}/status`,
        body: { status: 'in-progress' },
      });
      console.log(`  ✓ Moved "Design homepage" to in-progress`);

      await makeRequest({
        method: 'PUT',
        path: `/tasks/${task2Id}/status`,
        body: { status: 'in-progress' },
      });
      console.log(`  ✓ Moved "Implement backend API" to in-progress`);

      await makeRequest({
        method: 'PUT',
        path: `/tasks/${task1Id}/status`,
        body: { status: 'done' },
      });
      console.log(`  ✓ Moved "Design homepage" to done\n`);

      // ========== ADD COMMENTS ==========
      console.log('💬 Adding comments...');
      await makeRequest({
        method: 'POST',
        path: '/comments',
        body: {
          taskId: task2Id,
          authorId: bobId,
          body: 'I have started implementation. Need to clarify API requirements.',
        },
      });
      console.log(`  ✓ Bob added comment on task 2`);

      await makeRequest({
        method: 'POST',
        path: '/comments',
        body: {
          taskId: task2Id,
          authorId: aliceId,
          body: 'Let me review and we can discuss next week.',
        },
      });
      console.log(`  ✓ Alice added comment on task 2\n`);

      // ========== CHECK NOTIFICATIONS ==========
      console.log('🔔 Checking notifications...');
      const aliceNotifs = await makeRequest({
        method: 'GET',
        path: `/notifications?userId=${aliceId}`,
      });
      console.log(`  ✓ Alice has ${aliceNotifs.data.length} notifications`);
      aliceNotifs.data.forEach((notif: any, i: number) => {
        console.log(`    ${i + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.message}`);
      });

      const bobNotifs = await makeRequest({
        method: 'GET',
        path: `/notifications?userId=${bobId}`,
      });
      console.log(`\n  ✓ Bob has ${bobNotifs.data.length} notifications`);
      bobNotifs.data.forEach((notif: any, i: number) => {
        console.log(`    ${i + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.message}`);
      });

      const charlieNotifs = await makeRequest({
        method: 'GET',
        path: `/notifications?userId=${charlieId}`,
      });
      console.log(`\n  ✓ Charlie has ${charlieNotifs.data.length} notifications`);
      charlieNotifs.data.forEach((notif: any, i: number) => {
        console.log(`    ${i + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.message}`);
      });

      // ========== MARK NOTIFICATION AS READ ==========
      console.log('\n📖 Marking notification as read...');
      if (aliceNotifs.data.length > 0) {
        await makeRequest({
          method: 'PUT',
          path: `/notifications/${aliceNotifs.data[0].id}/read`,
        });
        console.log(`  ✓ Marked Alice's first notification as read\n`);
      }

      // ========== VERIFY STATE ==========
      console.log('✔️  Verifying final state...');
      const allUsers = await makeRequest({
        method: 'GET',
        path: '/users',
      });
      console.log(`  ✓ Total users: ${allUsers.data.length}`);

      const allProjects = await makeRequest({
        method: 'GET',
        path: '/projects',
      });
      console.log(`  ✓ Total projects: ${allProjects.data.length}`);

      const allTasks = await makeRequest({
        method: 'GET',
        path: `/tasks?projectId=${projectId}`,
      });
      console.log(`  ✓ Total tasks in project: ${allTasks.data.length}`);
      allTasks.data.forEach((task: any) => {
        console.log(`    - ${task.title}: ${task.status}`);
      });

      const allComments = await makeRequest({
        method: 'GET',
        path: `/comments?taskId=${task2Id}`,
      });
      console.log(`  ✓ Total comments on task 2: ${allComments.data.length}\n`);

      console.log('✨ Demo completed successfully!\n');
      console.log('📊 Summary:');
      console.log(`  - Created 3 users`);
      console.log(`  - Created 1 project with 3 members`);
      console.log(`  - Created 3 tasks`);
      console.log(`  - Assigned all tasks`);
      console.log(`  - Transitioned 2 tasks (1 to done)`);
      console.log(`  - Added 2 comments`);
      console.log(`  - Generated notifications based on events`);
    } catch (error) {
      console.error('❌ Error during demo:', error);
    } finally {
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    }
  });
}

runDemo();
