import { bootstrap } from './main';
import * as http from 'node:http';
import { URL } from 'node:url';
import { User, Project, Task, Comment, Notification } from './types';

const API_BASE_URL = 'http://localhost:3000';

async function makeRequest(method: string, path: string, body?: any): Promise<any> {
  const parsedUrl = new URL(path, API_BASE_URL);
  const options: http.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname + parsedUrl.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsedData)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}, Raw data: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDemo() {
  console.log('Starting API server for demo...');
  const { server } = await bootstrap();
  // Give server a moment to start
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    console.log('\n--- Creating Users ---');
    const user1 = await makeRequest('POST', '/users', { name: 'Alice', email: 'alice@example.com' }) as User;
    console.log('Created user:', user1);
    const user2 = await makeRequest('POST', '/users', { name: 'Bob', email: 'bob@example.com' }) as User;
    console.log('Created user:', user2);
    const user3 = await makeRequest('POST', '/users', { name: 'Charlie', email: 'charlie@example.com' }) as User;
    console.log('Created user:', user3);

    console.log('\n--- Listing Users ---');
    const users = await makeRequest('GET', '/users') as User[];
    console.log('All users:', users);

    console.log('\n--- Creating Project ---');
    const project1 = await makeRequest('POST', '/projects', { name: 'My First Project', description: 'A project to manage tasks.' }) as Project;
    console.log('Created project:', project1);

    console.log('\n--- Adding Members to Project ---');
    await makeRequest('POST', `/projects/${project1.id}/members`, { userId: user1.id });
    console.log('Added Alice to project.');
    await makeRequest('POST', `/projects/${project1.id}/members`, { userId: user2.id });
    console.log('Added Bob to project.');
    const updatedProject = await makeRequest('GET', `/projects/${project1.id}`) as Project;
    console.log('Project members:', updatedProject.memberIds);

    console.log('\n--- Creating Tasks ---');
    const task1 = await makeRequest('POST', '/tasks', { title: 'Design API', description: 'Design the REST API endpoints.', projectId: project1.id }) as Task;
    console.log('Created task:', task1);
    const task2 = await makeRequest('POST', '/tasks', { title: 'Implement Services', description: 'Write all service logic.', projectId: project1.id }) as Task;
    console.log('Created task:', task2);

    console.log('\n--- Assigning Task ---');
    const assignedTask1 = await makeRequest('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id }) as Task;
    console.log('Assigned task 1 to Alice:', assignedTask1);
    const assignedTask2 = await makeRequest('PUT', `/tasks/${task2.id}/assign`, { assigneeId: user2.id }) as Task;
    console.log('Assigned task 2 to Bob:', assignedTask2);

    console.log('\n--- Changing Task Status ---');
    // task1: todo -> in-progress
    const task1InProgress = await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' }) as Task;
    console.log('Task 1 status (in-progress):', task1InProgress.status);

    // task1: in-progress -> done
    const task1Done = await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'done' }) as Task;
    console.log('Task 1 status (done):', task1Done.status);

    // Test invalid status change: todo -> done (skipping in-progress)
    try {
      console.log('Attempting invalid status change (todo -> done)...');
      await makeRequest('PUT', `/tasks/${task2.id}/status`, { status: 'done' });
      console.error('ERROR: Invalid status change should have failed.');
    } catch (error: any) {
      console.log('Successfully blocked invalid status change:', error.message);
    }

    // Test invalid status change: done -> in-progress (backward)
    try {
      console.log('Attempting invalid status change (done -> in-progress)...');
      await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
      console.error('ERROR: Invalid status change should have failed.');
    } catch (error: any) {
      console.log('Successfully blocked invalid status change:', error.message);
    }

    console.log('\n--- Adding Comments ---');
    const comment1 = await makeRequest('POST', '/comments', { taskId: task1.id, authorId: user1.id, body: 'Great work on this task!' }) as Comment;
    console.log('Added comment:', comment1);
    const comment2 = await makeRequest('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'I agree, looking good.' }) as Comment;
    console.log('Added comment:', comment2);

    console.log("\n--- Checking Notifications for Alice (user1) ---");
    const aliceNotifications = await makeRequest('GET', `/notifications?userId=${user1.id}`) as Notification[];
    console.log("Alice's notifications:", aliceNotifications);
    if (aliceNotifications.length > 0) {
      const firstNotif = aliceNotifications[0];
      const readNotif = await makeRequest('PUT', `/notifications/${firstNotif.id}/read`) as Notification;
      console.log('Marked first notification as read:', readNotif);
    }

    console.log("\n--- Checking Notifications for Bob (user2) ---");
    const bobNotifications = await makeRequest('GET', `/notifications?userId=${user2.id}`) as Notification[];
    console.log("Bob's notifications:", bobNotifications);

  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    console.log("\n--- Demo Complete. Shutting down server ---");
    server.close(() => {
      console.log('Server shut down successfully.');
      process.exit(0);
    });
  }
}

runDemo();
