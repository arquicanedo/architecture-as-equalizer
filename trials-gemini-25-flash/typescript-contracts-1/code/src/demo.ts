import * as http from 'node:http';

const API_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const API_BASE_URL = `http://localhost:${API_PORT}`;

async function sendRequest(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestOptions: http.RequestOptions = {
      hostname: 'localhost',
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(requestOptions, (res: http.IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: string | Buffer) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : undefined);
          } catch (e) {
            resolve(data); // Raw data if not JSON
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} ${res.statusMessage} - ${data}`));
        }
      });
    });

    req.on('error', (e: Error) => { reject(e); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDemo() {
  console.log('Starting API demo...');

  // --- Users ---
  console.log('\n--- Users ---');
  const user1 = await sendRequest('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  console.log('Created User 1:', user1);

  const user2 = await sendRequest('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Created User 2:', user2);

  const allUsers = await sendRequest('GET', '/users');
  console.log('All Users:', allUsers);

  const updatedUser1 = await sendRequest('PUT', `/users/${user1.id}`, { name: 'Alicia' });
  console.log('Updated User 1:', updatedUser1);

  // --- Projects ---
  console.log('\n--- Projects ---');
  const project1 = await sendRequest('POST', '/projects', { name: 'Project X', description: 'First project' });
  console.log('Created Project 1:', project1);

  const project2 = await sendRequest('POST', '/projects', { name: 'Project Y', description: 'Second project' });
  console.log('Created Project 2:', project2);

  let allProjects = await sendRequest('GET', '/projects');
  console.log('All Projects:', allProjects);

  const project1WithMember = await sendRequest('POST', `/projects/${project1.id}/members`, { userId: user1.id });
  console.log('Project 1 with User 1 as member:', project1WithMember);

  // --- Tasks ---
  console.log('\n--- Tasks ---');
  const task1 = await sendRequest('POST', '/tasks', { title: 'Task Alpha', description: 'Desc for alpha', projectId: project1.id });
  console.log('Created Task 1:', task1);

  const task2 = await sendRequest('POST', '/tasks', { title: 'Task Beta', description: 'Desc for beta', projectId: project1.id });
  console.log('Created Task 2:', task2);

  const projectTasks = await sendRequest('GET', `/tasks?projectId=${project1.id}`);
  console.log('Tasks for Project 1:', projectTasks);

  const assignedTask1 = await sendRequest('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
  console.log('Assigned Task 1 to User 1:', assignedTask1);

  const inProgressTask1 = await sendRequest('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  console.log('Task 1 status to in-progress:', inProgressTask1);

  const doneTask1 = await sendRequest('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
  console.log('Task 1 status to done:', doneTask1);

  try {
    await sendRequest('PUT', `/tasks/${task1.id}/status`, { status: 'todo' });
    console.log('Attempted invalid status change (should fail)');
  } catch (e: any) {
    console.log('Invalid status change failed as expected:', e.message);
  }

  // --- Comments ---
  console.log('\n--- Comments ---');
  const comment1 = await sendRequest('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great task!' });
  console.log('Created Comment 1:', comment1);

  const task1Comments = await sendRequest('GET', `/comments?taskId=${task1.id}`);
  console.log('Comments for Task 1:', task1Comments);

  // Wait a moment for async notifications to process
  await new Promise(resolve => setTimeout(resolve, 100));

  // --- Notifications ---
  console.log('\n--- Notifications ---');
  const user1Notifications = await sendRequest('GET', `/notifications?userId=${user1.id}`);
  console.log('User 1 Notifications (should have task assigned, status change, and comment):', user1Notifications);

  if (user1Notifications.length > 0) {
    const readNotification = await sendRequest('PUT', `/notifications/${user1Notifications[0].id}/read`);
    console.log('Marked first notification as read:', readNotification);
  }

  const user1NotificationsAfterRead = await sendRequest('GET', `/notifications?userId=${user1.id}`);
  console.log('User 1 Notifications after reading one:', user1NotificationsAfterRead);

  // --- Cleanup ---
  console.log('\n--- Cleanup ---');
  await sendRequest('DELETE', `/tasks/${task2.id}`);
  console.log('Deleted Task 2');
  await sendRequest('DELETE', `/projects/${project2.id}`);
  console.log('Deleted Project 2');
  await sendRequest('DELETE', `/users/${user2.id}`);
  console.log('Deleted User 2');

  console.log('API demo complete!');
}

runDemo().catch(console.error);
