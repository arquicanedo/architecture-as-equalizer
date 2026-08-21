import http from 'http';
import { ApiRouter } from './router';

function request(method: string, path: string, body?: any, port = 0): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res
          .on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
          .on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            try {
              resolve(raw ? JSON.parse(raw) : undefined);
            } catch (e) {
              resolve(undefined);
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
  const router = new ApiRouter();
  const port = await router.listen(0); // use random available port
  console.log(`Server started for demo on port ${port}`);

  try {
    // Create users
    const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' }, port);
    const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' }, port);
    console.log('Created users:', alice, bob);

    // Create project
    const project = await request('POST', '/projects', { name: 'Website Redesign', description: 'Revamp the company website' }, port);
    console.log('Created project:', project);

    // Add members
    await request('POST', `/projects/${project.id}/members`, { userId: alice.id }, port);
    await request('POST', `/projects/${project.id}/members`, { userId: bob.id }, port);
    const projectAfterMembers = await request('GET', `/projects/${project.id}`, undefined, port);
    console.log('Project with members:', projectAfterMembers);

    // Create tasks
    const task1 = await request('POST', '/tasks', { title: 'Design mockups', description: 'Create new mockups', projectId: project.id }, port);
    const task2 = await request('POST', '/tasks', { title: 'Implement frontend', description: 'Build the UI', projectId: project.id, assigneeId: alice.id }, port);
    console.log('Created tasks:', task1, task2);

    // Assign task and change status
    const assigned = await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: bob.id }, port);
    console.log('Assigned task1 to Bob:', assigned);

    const inProgress = await request('PUT', `/tasks/${task2.id}/status`, { status: 'in-progress' }, port);
    const done = await request('PUT', `/tasks/${task2.id}/status`, { status: 'done' }, port);
    console.log('Task2 status updates:', inProgress, done);

    // Add comments
    await request('POST', '/comments', { taskId: task2.id, authorId: alice.id, body: 'Starting work on this.' }, port);
    await request('POST', '/comments', { taskId: task2.id, authorId: bob.id, body: 'Looks good so far.' }, port);

    // Give some time for events to deliver
    await new Promise((r) => setTimeout(r, 10));

    // Check notifications for Alice and Bob
    const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`, undefined, port);
    const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`, undefined, port);
    console.log('Alice notifications:', aliceNotifs);
    console.log('Bob notifications:', bobNotifs);

    // Mark one notification read
    if (aliceNotifs && aliceNotifs.length) {
      const updated = await request('PUT', `/notifications/${aliceNotifs[0].id}/read`, undefined, port);
      console.log('Marked Alice notification as read:', updated);
    }
  } finally {
    // Stop server after demo
    await router.close();
    console.log('Demo complete; server closed.');
  }
}

runDemo().catch((err) => {
  console.error('Demo failed', err);
  process.exit(1);
});
