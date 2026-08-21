import * as http from 'node:http';

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(`${BASE_URL}${path}`, options, (res: http.IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { // Use Buffer as default for Node.js http data chunks
        data += chunk.toString(); // Convert Buffer to string
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            resolve(data); // In case of non-JSON response
          }
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e: Error) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function demo() {
  console.log('Starting demo...');

  // 1. Create Users
  console.log('\n--- Creating Users ---');
  const user1 = await makeRequest('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  console.log('Created user: ' + JSON.stringify(user1));
  const user2 = await makeRequest('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Created user: ' + JSON.stringify(user2));
  const user3 = await makeRequest('POST', '/users', { name: 'Charlie', email: 'charlie@example.com' });
  console.log('Created user: ' + JSON.stringify(user3));

  // Get all users
  const allUsers = await makeRequest('GET', '/users');
  console.log('All users: ' + JSON.stringify(allUsers));

  // 2. Create Project
  console.log('\n--- Creating Project ---');
  const project1 = await makeRequest('POST', '/projects', { name: 'New Feature Dev', description: 'Develop a groundbreaking new feature' });
  console.log('Created project: ' + JSON.stringify(project1));

  // 3. Add Members to Project
  console.log('\n--- Adding Members to Project ---');
  await makeRequest('POST', `/projects/${project1.id}/members`, { userId: user1.id });
  await makeRequest('POST', `/projects/${project1.id}/members`, { userId: user2.id });
  const updatedProject = await makeRequest('GET', `/projects/${project1.id}`);
  console.log('Project with members: ' + JSON.stringify(updatedProject));

  // 4. Create Tasks
  console.log('\n--- Creating Tasks ---');
  const task1 = await makeRequest('POST', '/tasks', { title: 'Implement UI', description: 'Build the user interface components', projectId: project1.id });
  console.log('Created task: ' + JSON.stringify(task1));
  const task2 = await makeRequest('POST', '/tasks', { title: 'Write Backend API', description: 'Develop REST endpoints', projectId: project1.id });
  console.log('Created task: ' + JSON.stringify(task2));
  const task3 = await makeRequest('POST', '/tasks', { title: 'Prepare Documentation', description: 'Write user and developer docs', projectId: project1.id });
  console.log('Created task: ' + JSON.stringify(task3));

  // Get tasks for project
  const projectTasks = await makeRequest('GET', `/tasks?projectId=${project1.id}`);
  console.log('Tasks for project: ' + JSON.stringify(projectTasks));

  // 5. Assign Tasks
  console.log('\n--- Assigning Tasks ---');
  const assignedTask1 = await makeRequest('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
  console.log('Assigned task 1 to Alice: ' + JSON.stringify(assignedTask1));
  const assignedTask2 = await makeRequest('PUT', `/tasks/${task2.id}/assign`, { assigneeId: user2.id });
  console.log('Assigned task 2 to Bob: ' + JSON.stringify(assignedTask2));

  // 6. Change Task Status
  console.log('\n--- Changing Task Status ---');
  const task1InProgress = await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  console.log('Task 1 status to in-progress: ' + JSON.stringify(task1InProgress));
  try {
    // This should fail: skipping todo -> done
    await makeRequest('PUT', `/tasks/${task3.id}/status`, { status: 'done' });
  } catch (error: any) {
    console.error('Expected error (skipping status): ' + error.message);
  }
  const task1Done = await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
  console.log('Task 1 status to done: ' + JSON.stringify(task1Done));

  // 7. Add Comments
  console.log('\n--- Adding Comments ---');
  const comment1 = await makeRequest('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great work on the UI!' });
  console.log('Commented on task 1: ' + JSON.stringify(comment1));
  const comment2 = await makeRequest('POST', '/comments', { taskId: task2.id, authorId: user1.id, body: 'I need some clarity on the API specs.' });
  console.log('Commented on task 2: ' + JSON.stringify(comment2));

  // Get comments for task
  const taskComments = await makeRequest('GET', `/comments?taskId=${task1.id}`);
  console.log('Comments for task 1: ' + JSON.stringify(taskComments));

  // 8. Check Notifications
  console.log('\n--- Checking Notifications ---');
  const user1Notifications = await makeRequest('GET', `/notifications?userId=${user1.id}`);
  console.log('Alice\'s notifications: ' + JSON.stringify(user1Notifications));
  const user2Notifications = await makeRequest('GET', `/notifications?userId=${user2.id}`);
  console.log('Bob\'s notifications: ' + JSON.stringify(user2Notifications));
  const user3Notifications = await makeRequest('GET', `/notifications?userId=${user3.id}`);
  console.log('Charlie\'s notifications (should be empty): ' + JSON.stringify(user3Notifications));

  // Mark notification as read
  if (user1Notifications.length > 0) {
    const notificationToRead = user1Notifications[0];
    const readNotification = await makeRequest('PUT', `/notifications/${notificationToRead.id}/read`);
    console.log('Marked notification as read: ' + JSON.stringify(readNotification));
    const updatedUser1Notifications = await makeRequest('GET', `/notifications?userId=${user1.id}`);
    console.log('Alice\'s notifications after read: ' + JSON.stringify(updatedUser1Notifications));
  }

  console.log('\nDemo finished. Please manually stop the server running main.ts.');
}

demo().catch(error => {
  console.error('Demo failed: ' + error.message);
});
