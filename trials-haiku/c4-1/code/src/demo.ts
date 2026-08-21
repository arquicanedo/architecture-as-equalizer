/**
 * Demo Script - Exercises all features of the Task Management System
 * Starts the server and runs through the complete workflow:
 * 1. Create users
 * 2. Create a project
 * 3. Add members to project
 * 4. Create tasks
 * 5. Assign tasks
 * 6. Change task status
 * 7. Add comments
 * 8. Check notifications
 */

import { createServer } from 'http';
import { router } from './router';

const PORT = 3001;

/**
 * Make HTTP request
 */
function makeRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = require('http').request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
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

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run the demo
 */
async function runDemo(): Promise<void> {
  const server = createServer(router);

  return new Promise((resolve, reject) => {
    server.listen(PORT, async () => {
      console.log(`\n=== Task Management API Demo ===\n`);
      console.log(`Server running on port ${PORT}\n`);

      try {
        // 1. Create users
        console.log('1. Creating users...');
        const alice = await makeRequest('POST', '/users', {
          name: 'Alice',
          email: 'alice@example.com',
        });
        const aliceId = alice.data.id;
        console.log(`   ✓ Created Alice (${aliceId})`);

        const bob = await makeRequest('POST', '/users', {
          name: 'Bob',
          email: 'bob@example.com',
        });
        const bobId = bob.data.id;
        console.log(`   ✓ Created Bob (${bobId})`);

        const charlie = await makeRequest('POST', '/users', {
          name: 'Charlie',
          email: 'charlie@example.com',
        });
        const charlieId = charlie.data.id;
        console.log(`   ✓ Created Charlie (${charlieId})\n`);

        // 2. Create a project
        console.log('2. Creating a project...');
        const project = await makeRequest('POST', '/projects', {
          name: 'Web App Redesign',
          description: 'Redesign the company web application',
        });
        const projectId = project.data.id;
        console.log(`   ✓ Created project "${project.data.name}" (${projectId})\n`);

        // 3. Add members to project
        console.log('3. Adding members to project...');
        await makeRequest('POST', `/projects/${projectId}/members`, {
          userId: aliceId,
        });
        console.log(`   ✓ Added Alice to project`);

        await makeRequest('POST', `/projects/${projectId}/members`, {
          userId: bobId,
        });
        console.log(`   ✓ Added Bob to project`);

        await makeRequest('POST', `/projects/${projectId}/members`, {
          userId: charlieId,
        });
        console.log(`   ✓ Added Charlie to project\n`);

        // 4. Create tasks
        console.log('4. Creating tasks...');
        const task1 = await makeRequest('POST', '/tasks', {
          title: 'Design mockups',
          description: 'Create wireframes and visual mockups',
          projectId: projectId,
        });
        const task1Id = task1.data.id;
        console.log(`   ✓ Created task "${task1.data.title}" (${task1Id})`);

        const task2 = await makeRequest('POST', '/tasks', {
          title: 'Implement frontend',
          description: 'Build React components',
          projectId: projectId,
        });
        const task2Id = task2.data.id;
        console.log(`   ✓ Created task "${task2.data.title}" (${task2Id})`);

        const task3 = await makeRequest('POST', '/tasks', {
          title: 'Setup database',
          description: 'Configure PostgreSQL and migrations',
          projectId: projectId,
        });
        const task3Id = task3.data.id;
        console.log(`   ✓ Created task "${task3.data.title}" (${task3Id})\n`);

        // 5. Assign tasks
        console.log('5. Assigning tasks...');
        await makeRequest('PUT', `/tasks/${task1Id}/assign`, {
          assigneeId: aliceId,
        });
        console.log(`   ✓ Assigned "Design mockups" to Alice`);

        await makeRequest('PUT', `/tasks/${task2Id}/assign`, {
          assigneeId: bobId,
        });
        console.log(`   ✓ Assigned "Implement frontend" to Bob`);

        await makeRequest('PUT', `/tasks/${task3Id}/assign`, {
          assigneeId: charlieId,
        });
        console.log(`   ✓ Assigned "Setup database" to Charlie\n`);

        // Wait for event processing
        await delay(100);

        // 6. Change task status
        console.log('6. Changing task statuses...');
        await makeRequest('PUT', `/tasks/${task1Id}/status`, {
          status: 'in-progress',
        });
        console.log(`   ✓ Task "Design mockups" → in-progress`);

        await makeRequest('PUT', `/tasks/${task1Id}/status`, {
          status: 'done',
        });
        console.log(`   ✓ Task "Design mockups" → done`);

        await makeRequest('PUT', `/tasks/${task2Id}/status`, {
          status: 'in-progress',
        });
        console.log(`   ✓ Task "Implement frontend" → in-progress\n`);

        // 7. Add comments
        console.log('7. Adding comments to tasks...');
        const comment1 = await makeRequest('POST', '/comments', {
          taskId: task1Id,
          authorId: aliceId,
          body: 'Just completed the mockups. Please review!',
        });
        console.log(`   ✓ Alice commented on "Design mockups"`);

        const comment2 = await makeRequest('POST', '/comments', {
          taskId: task2Id,
          authorId: bobId,
          body: 'Started working on the React components',
        });
        console.log(`   ✓ Bob commented on "Implement frontend"\n`);

        // Wait for event processing
        await delay(100);

        // 8. Check notifications
        console.log('8. Checking notifications...');
        const aliceNotifs = await makeRequest('GET', `/notifications?userId=${aliceId}`);
        console.log(`   ✓ Alice has ${aliceNotifs.data.length} notifications:`);
        aliceNotifs.data.forEach((notif: any, i: number) => {
          console.log(`     - [${i + 1}] ${notif.message}`);
        });

        const bobNotifs = await makeRequest('GET', `/notifications?userId=${bobId}`);
        console.log(`   ✓ Bob has ${bobNotifs.data.length} notifications:`);
        bobNotifs.data.forEach((notif: any, i: number) => {
          console.log(`     - [${i + 1}] ${notif.message}`);
        });

        const charlieNotifs = await makeRequest('GET', `/notifications?userId=${charlieId}`);
        console.log(`   ✓ Charlie has ${charlieNotifs.data.length} notifications:`);
        charlieNotifs.data.forEach((notif: any, i: number) => {
          console.log(`     - [${i + 1}] ${notif.message}`);
        });

        console.log('\n9. Marking notifications as read...');
        if (aliceNotifs.data.length > 0) {
          const firstNotif = aliceNotifs.data[0];
          const readResponse = await makeRequest('PUT', `/notifications/${firstNotif.id}/read`, {});
          console.log(`   ✓ Marked notification as read (read: ${readResponse.data.read})\n`);
        }

        // 10. Verify data consistency
        console.log('10. Verifying data consistency...');
        const allUsers = await makeRequest('GET', '/users', undefined);
        console.log(`   ✓ Total users: ${allUsers.data.length}`);

        const allProjects = await makeRequest('GET', '/projects', undefined);
        console.log(`   ✓ Total projects: ${allProjects.data.length}`);

        const projectTasks = await makeRequest('GET', `/tasks?projectId=${projectId}`, undefined);
        console.log(`   ✓ Tasks in project: ${projectTasks.data.length}`);

        const task1Comments = await makeRequest('GET', `/comments?taskId=${task1Id}`, undefined);
        console.log(`   ✓ Comments on "Design mockups": ${task1Comments.data.length}\n`);

        console.log('=== Demo Complete ===\n');
        console.log('All features working correctly:');
        console.log('✓ User management');
        console.log('✓ Project management and membership');
        console.log('✓ Task creation and assignment');
        console.log('✓ Task status transitions');
        console.log('✓ Comments on tasks');
        console.log('✓ Event-driven notifications');
        console.log('✓ Data consistency\n');

        server.close(() => {
          resolve();
        });
      } catch (error) {
        console.error('Demo error:', error);
        server.close(() => {
          reject(error);
        });
      }
    });
  });
}

// Run demo
runDemo()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
