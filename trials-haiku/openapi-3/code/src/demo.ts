/**
 * Demo Script
 * Tests end-to-end workflow
 */

import { createServer } from 'http';
import { handleRequest } from './router';

const PORT = 3001;

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
}

let server: any;

async function makeRequest(options: RequestOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    
    const data = options.body ? JSON.stringify(options.body) : undefined;
    const reqOptions: any = {
      hostname: 'localhost',
      port: PORT,
      path: options.path,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(reqOptions, (res: any) => {
      let responseData = '';
      res.on('data', (chunk: any) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function log(title: string, data: any): Promise<void> {
  console.log(`\n📋 ${title}`);
  console.log(JSON.stringify(data, null, 2));
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo(): Promise<void> {
  console.log('\n========================================');
  console.log('🚀 Task Management API - Demo');
  console.log('========================================');

  // Start server
  server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    await handleRequest(req, res);
  });

  server.listen(PORT);
  await sleep(500); // Give server time to start

  try {
    // 1. Create users
    console.log('\n\n▶️  Step 1: Create Users');
    const user1 = await makeRequest({
      method: 'POST',
      path: '/users',
      body: { name: 'Alice', email: 'alice@example.com' },
    });
    await log('Created user Alice', user1);

    const user2 = await makeRequest({
      method: 'POST',
      path: '/users',
      body: { name: 'Bob', email: 'bob@example.com' },
    });
    await log('Created user Bob', user2);

    // 2. List users
    const users = await makeRequest({ method: 'GET', path: '/users' });
    await log('All users', users);

    // 3. Create project
    console.log('\n\n▶️  Step 2: Create Project');
    const project = await makeRequest({
      method: 'POST',
      path: '/projects',
      body: { name: 'Website Redesign', description: 'Redesign company website' },
    });
    await log('Created project', project);

    // 4. Add members to project
    console.log('\n\n▶️  Step 3: Add Members to Project');
    const projectWithAlice = await makeRequest({
      method: 'POST',
      path: `/projects/${project.id}/members`,
      body: { userId: user1.id },
    });
    await log(`Added Alice to project`, projectWithAlice);

    const projectWithBoth = await makeRequest({
      method: 'POST',
      path: `/projects/${project.id}/members`,
      body: { userId: user2.id },
    });
    await log(`Added Bob to project`, projectWithBoth);

    // 5. Create tasks
    console.log('\n\n▶️  Step 4: Create Tasks');
    const task1 = await makeRequest({
      method: 'POST',
      path: '/tasks',
      body: { title: 'Design mockups', description: 'Create UI mockups', projectId: project.id },
    });
    await log('Created task 1', task1);

    const task2 = await makeRequest({
      method: 'POST',
      path: '/tasks',
      body: { title: 'Implement frontend', description: 'Build React components', projectId: project.id },
    });
    await log('Created task 2', task2);

    // 6. List tasks
    const tasks = await makeRequest({ method: 'GET', path: `/tasks?projectId=${project.id}` });
    await log('All tasks for project', tasks);

    // 7. Assign tasks
    console.log('\n\n▶️  Step 5: Assign Tasks');
    const assignedTask1 = await makeRequest({
      method: 'PUT',
      path: `/tasks/${task1.id}/assign`,
      body: { assigneeId: user1.id },
    });
    await log(`Assigned task 1 to Alice`, assignedTask1);

    const assignedTask2 = await makeRequest({
      method: 'PUT',
      path: `/tasks/${task2.id}/assign`,
      body: { assigneeId: user2.id },
    });
    await log(`Assigned task 2 to Bob`, assignedTask2);

    // 8. Change task status
    console.log('\n\n▶️  Step 6: Change Task Status');
    const inProgressTask1 = await makeRequest({
      method: 'PUT',
      path: `/tasks/${task1.id}/status`,
      body: { status: 'in-progress' },
    });
    await log('Task 1 status changed to in-progress', inProgressTask1);

    const doneTask1 = await makeRequest({
      method: 'PUT',
      path: `/tasks/${task1.id}/status`,
      body: { status: 'done' },
    });
    await log('Task 1 status changed to done', doneTask1);

    // 9. Add comments
    console.log('\n\n▶️  Step 7: Add Comments');
    const comment1 = await makeRequest({
      method: 'POST',
      path: '/comments',
      body: {
        taskId: task1.id,
        authorId: user2.id,
        body: 'Great mockups! Ready to start implementing.',
      },
    });
    await log('Added comment to task 1', comment1);

    const comment2 = await makeRequest({
      method: 'POST',
      path: '/comments',
      body: {
        taskId: task2.id,
        authorId: user1.id,
        body: 'I will start on this next week.',
      },
    });
    await log('Added comment to task 2', comment2);

    // 10. List comments
    const task1Comments = await makeRequest({ method: 'GET', path: `/comments?taskId=${task1.id}` });
    await log('Comments on task 1', task1Comments);

    // 11. Check notifications
    console.log('\n\n▶️  Step 8: Check Notifications');
    const aliceNotifications = await makeRequest({ method: 'GET', path: `/notifications?userId=${user1.id}` });
    await log(`Notifications for Alice`, aliceNotifications);

    const bobNotifications = await makeRequest({ method: 'GET', path: `/notifications?userId=${user2.id}` });
    await log(`Notifications for Bob`, bobNotifications);

    // 12. Mark notification as read
    if (aliceNotifications.length > 0) {
      const readNotif = await makeRequest({
        method: 'PUT',
        path: `/notifications/${aliceNotifications[0].id}/read`,
      });
      await log('Marked notification as read', readNotif);
    }

    // 13. Update task
    console.log('\n\n▶️  Step 9: Update Task');
    const updatedTask2 = await makeRequest({
      method: 'PUT',
      path: `/tasks/${task2.id}`,
      body: { title: 'Implement frontend and backend', description: 'Build React components and API' },
    });
    await log('Updated task 2', updatedTask2);

    // 14. Get specific resources
    console.log('\n\n▶️  Step 10: Retrieve Specific Resources');
    const fetchedTask1 = await makeRequest({ method: 'GET', path: `/tasks/${task1.id}` });
    await log('Fetch task 1', fetchedTask1);

    const fetchedProject = await makeRequest({ method: 'GET', path: `/projects/${project.id}` });
    await log('Fetch project', fetchedProject);

    // 15. Update project
    const updatedProject = await makeRequest({
      method: 'PUT',
      path: `/projects/${project.id}`,
      body: { name: 'Website Redesign 2024' },
    });
    await log('Updated project', updatedProject);

    console.log('\n\n========================================');
    console.log('✅ Demo completed successfully!');
    console.log('========================================\n');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Demo failed:', error);
    server.close();
    process.exit(1);
  }
}

runDemo();
