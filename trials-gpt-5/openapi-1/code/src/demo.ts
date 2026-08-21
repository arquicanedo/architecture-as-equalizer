import { ApiRouter } from './router';
import http from 'http';

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({ hostname: 'localhost', port: 3001, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 }}, res => {
      let out = '';
      res.on('data', chunk => (out += chunk));
      res.on('end', () => {
        if (!out) return resolve(undefined);
        try { resolve(JSON.parse(out)); } catch (e) { resolve(out); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  const router = new ApiRouter();
  router.listen(3001);
  console.log('Demo server started on 3001');

  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users:', alice, bob);

  const project = await request('POST', '/projects', { name: 'Demo Project', description: 'A sample project' });
  await request('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${project.id}/members`, { userId: bob.id });
  const projFetched = await request('GET', `/projects/${project.id}`);
  console.log('Project:', projFetched);

  const task1 = await request('POST', '/tasks', { title: 'Setup repo', description: 'Initialize repository', projectId: project.id });
  const task2 = await request('POST', '/tasks', { title: 'Implement feature', description: 'Build the core feature', projectId: project.id });
  console.log('Tasks created:', task1, task2);

  const assigned1 = await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
  console.log('Assigned task1:', assigned1);
  const status1 = await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  console.log('Status changed:', status1);
  const status1Done = await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
  console.log('Status changed:', status1Done);

  const comment1 = await request('POST', '/comments', { taskId: task1.id, authorId: bob.id, body: 'Great job!' });
  console.log('Comment added:', comment1);

  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`);
  console.log('Alice notifications:', aliceNotifs);
  console.log('Bob notifications:', bobNotifs);

  if (aliceNotifs.length > 0) {
    const first = await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('Marked read:', first);
  }

  // Shutdown server after demo small delay
  setTimeout(() => {
    console.log('Demo complete.');
    process.exit(0);
  }, 500);
}

runDemo().catch(err => {
  console.error('Demo error:', err);
  process.exit(1);
});
