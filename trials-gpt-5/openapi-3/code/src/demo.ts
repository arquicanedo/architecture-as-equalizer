import { startServer } from './main';
import http from 'http';

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data ? Buffer.byteLength(data) : 0,
        },
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          if (!raw) return resolve(undefined);
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve(raw);
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
  startServer(3000);

  console.log('--- Create users ---');
  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log(alice, bob);

  console.log('--- Create project ---');
  const project = await request('POST', '/projects', { name: 'Apollo', description: 'Moon mission' });
  console.log(project);

  console.log('--- Add members ---');
  await request('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${project.id}/members`, { userId: bob.id });
  const updatedProject = await request('GET', `/projects/${project.id}`);
  console.log(updatedProject);

  console.log('--- Create tasks ---');
  const task1 = await request('POST', '/tasks', { title: 'Design module', description: 'Design lunar module', projectId: project.id });
  const task2 = await request('POST', '/tasks', { title: 'Build module', description: 'Build lunar module', projectId: project.id });
  console.log(task1, task2);

  console.log('--- Assign tasks ---');
  await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
  await request('PUT', `/tasks/${task2.id}/assign`, { assigneeId: bob.id });

  console.log('--- Change status ---');
  await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });

  console.log('--- Add comments ---');
  const comment1 = await request('POST', '/comments', { taskId: task1.id, authorId: alice.id, body: 'Initial draft ready.' });
  const comment2 = await request('POST', '/comments', { taskId: task1.id, authorId: bob.id, body: 'Reviewed and approved.' });
  console.log(comment1, comment2);

  console.log('--- Check notifications ---');
  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`);
  console.log('Alice notifications:', aliceNotifs);
  console.log('Bob notifications:', bobNotifs);

  if (aliceNotifs.length > 0) {
    const n = await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('Marked Alice notif read:', n);
  }

  console.log('--- List tasks by project ---');
  const tasks = await request('GET', `/tasks?projectId=${project.id}`);
  console.log(tasks);

  console.log('Demo completed. You can Ctrl+C to stop the server.');
}

runDemo().catch(err => {
  console.error('Demo error:', err);
});
