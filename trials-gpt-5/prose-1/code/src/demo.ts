import http from 'http';

function request(hostname: string, port: number, method: string, path: string, body?: any): Promise<any> {
  const data = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const str = Buffer.concat(chunks).toString('utf8');
        try {
          const obj = str ? JSON.parse(str) : undefined;
          resolve({ status: res.statusCode, body: obj });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function demo() {
  // Start server on an ephemeral port by setting env before importing
  process.env.PORT = '0';
  const { server } = await import('./main');

  // Wait for server to be listening and get port
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => resolve());
      server.once('error', (e) => reject(e));
    });
  }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to get server address');
  const port = address.port;
  const host = 'localhost';

  console.log('--- DEMO START ---');

  // Create users
  const alice = (await request(host, port, 'POST', '/users', { name: 'Alice', email: 'alice@example.com' })).body;
  const bob = (await request(host, port, 'POST', '/users', { name: 'Bob', email: 'bob@example.com' })).body;
  console.log('Users:', await request(host, port, 'GET', '/users'));

  // Create project
  const project = (await request(host, port, 'POST', '/projects', { name: 'Proj A', description: 'Demo project' })).body;
  await request(host, port, 'POST', `/projects/${project.id}/members`, { userId: alice.id });
  await request(host, port, 'POST', `/projects/${project.id}/members`, { userId: bob.id });
  console.log('Project:', await request(host, port, 'GET', `/projects/${project.id}`));

  // Create tasks
  const t1 = (await request(host, port, 'POST', '/tasks', { title: 'Setup repo', description: 'Init git', projectId: project.id, assignee: alice.id })).body;
  const t2 = (await request(host, port, 'POST', '/tasks', { title: 'Write docs', description: 'README', projectId: project.id })).body;
  console.log('Tasks in project:', await request(host, port, 'GET', `/tasks?projectId=${project.id}`));

  // Assign and change status
  await request(host, port, 'PUT', `/tasks/${t2.id}/assign`, { assignee: bob.id });
  await request(host, port, 'PUT', `/tasks/${t1.id}/status`, { status: 'in-progress' });
  await request(host, port, 'PUT', `/tasks/${t1.id}/status`, { status: 'done' });

  // Comments
  await request(host, port, 'POST', '/comments', { taskId: t1.id, authorId: bob.id, body: 'Looks good!' });
  console.log('Comments for t1:', await request(host, port, 'GET', `/comments?taskId=${t1.id}`));

  // Notifications
  await new Promise(r => setTimeout(r, 100));
  console.log('Notifications for Alice:', await request(host, port, 'GET', `/notifications?userId=${alice.id}`));
  console.log('Notifications for Bob:', await request(host, port, 'GET', `/notifications?userId=${bob.id}`));

  // Mark first notification for Alice as read
  const aliceNotifs = (await request(host, port, 'GET', `/notifications?userId=${alice.id}`)).body;
  if (aliceNotifs.length > 0) {
    await request(host, port, 'PUT', `/notifications/${aliceNotifs[0].id}/read`);
  }
  console.log('Notifications for Alice after read:', await request(host, port, 'GET', `/notifications?userId=${alice.id}`));

  console.log('--- DEMO END ---');
}

// Run demo
// eslint-disable-next-line @typescript-eslint/no-floating-promises
demo().catch(err => {
  console.error('Demo error', err);
});
