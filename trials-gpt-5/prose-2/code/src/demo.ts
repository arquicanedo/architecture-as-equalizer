import http from 'http';
import { buildServer } from './bootstrap';

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c as Buffer));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          try {
            resolve(raw ? JSON.parse(raw) : undefined);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  console.log('Starting server...');
  const server = buildServer();
  await new Promise<void>((resolve) => server.listen(3000, resolve));

  // Create users
  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users:', await request('GET', '/users'));

  // Create project
  const project = await request('POST', '/projects', { name: 'Project A', description: 'Demo project' });
  await request('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${project.id}/members`, { userId: bob.id });
  console.log('Project:', await request('GET', `/projects/${project.id}`));

  // Create task
  const task1 = await request('POST', '/tasks', { title: 'Setup repo', description: 'Initialize repository', projectId: project.id, assigneeId: alice.id });
  const task2 = await request('POST', '/tasks', { title: 'Write docs', description: 'Documentation', projectId: project.id });
  console.log('Tasks in project:', await request('GET', `/tasks?projectId=${project.id}`));

  // Assign and progress task
  await request('PUT', `/tasks/${task2.id}/assign`, { assigneeId: bob.id });
  await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });

  // Comments
  await request('POST', '/comments', { taskId: task1.id, authorId: bob.id, text: 'Great job!' });
  await request('POST', '/comments', { taskId: task2.id, authorId: alice.id, text: 'Please add more details.' });
  console.log('Comments for task1:', await request('GET', `/comments?taskId=${task1.id}`));

  // Notifications
  console.log('Notifications for Alice:', await request('GET', `/notifications?userId=${alice.id}`));
  console.log('Notifications for Bob:', await request('GET', `/notifications?userId=${bob.id}`));

  // Mark first notification read for Alice (if any)
  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  if (aliceNotifs[0]) {
    await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('After marking read:', await request('GET', `/notifications?userId=${alice.id}`));
  }

  // Shutdown server
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
