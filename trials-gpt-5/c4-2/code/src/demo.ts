import { ApiRouter } from './router';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import http from 'http';

async function request(method: string, path: string, body?: any): Promise<any> {
  const payload = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path,
        method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': payload ? Buffer.byteLength(payload) : 0 },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (data.length === 0) return resolve({});
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({});
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runDemo() {
  const bus = new EventBus();
  const users = new UserService();
  const projects = new ProjectService();
  const tasks = new TaskService(bus);
  const comments = new CommentService(bus);
  const notifications = new NotificationService(bus);
  const router = new ApiRouter(bus, users, projects, tasks, comments, notifications);

  await router.start(3001);
  console.log('Demo server started on 3001');

  // Create users
  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users created:', alice, bob);

  // Create project
  const proj = await request('POST', '/projects', { name: 'Demo Project', description: 'A sample project' });
  console.log('Project created:', proj);

  // Add members
  await request('POST', `/projects/${proj.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${proj.id}/members`, { userId: bob.id });
  console.log('Members added');

  // Create tasks
  const task1 = await request('POST', '/tasks', { title: 'Set up repo', description: 'Init git', projectId: proj.id });
  const task2 = await request('POST', '/tasks', { title: 'Implement feature', description: 'Do work', projectId: proj.id });
  console.log('Tasks created:', task1, task2);

  // Assign tasks
  await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
  await request('PUT', `/tasks/${task2.id}/assign`, { assigneeId: bob.id });
  console.log('Tasks assigned');

  // Change status
  await request('PUT', `/tasks/${task1.id}/status`, { newStatus: 'in-progress' });
  await request('PUT', `/tasks/${task1.id}/status`, { newStatus: 'done' });
  console.log('Task1 progressed to done');

  // Add comments
  await request('POST', '/comments', { taskId: task1.id, authorId: bob.id, body: 'Nice work!' });
  await request('POST', '/comments', { taskId: task2.id, authorId: alice.id, body: 'Need help?' });
  console.log('Comments added');

  // Check notifications
  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`);
  console.log('Alice notifications:', aliceNotifs);
  console.log('Bob notifications:', bobNotifs);

  // Mark one as read
  if (aliceNotifs[0]) {
    const updated = await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('Marked as read:', updated);
  }

  // Shutdown
  await router.stop();
  console.log('Demo complete. Server stopped.');
}

runDemo().catch((err) => {
  console.error('Demo failed', err);
});
