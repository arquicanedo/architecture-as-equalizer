import http from 'http';
import net from 'net';

function request(method: string, path: string, body?: any) {
  return new Promise<any>((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json' } } as any;
    const req = http.request(opts, (res) => {
      const chunks: any[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString();
        const parsed = s ? JSON.parse(s) : null;
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function isPortOpen(port = 3000, host = '127.0.0.1', timeout = 200) {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let called = false;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      called = true;
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      if (called) return;
      called = true;
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      if (called) return;
      called = true;
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function runDemo() {
  console.log('Starting demo...');
  const open = await isPortOpen(3000);
  if (!open) {
    console.log('Starting server...');
    await import('./main');
    // give server a moment
    await sleep(200);
  } else {
    console.log('Server already running on port 3000');
  }

  // create users
  await request('POST', '/users', { id: 'u1', name: 'Alice', email: 'alice@example.com' });
  await request('POST', '/users', { id: 'u2', name: 'Bob', email: 'bob@example.com' });
  console.log('Created users');

  // create project
  await request('POST', '/projects', { id: 'p1', name: 'Project One', description: 'Demo project' });
  console.log('Created project');

  // add members
  await request('POST', '/projects/p1/members', { userId: 'u1' });
  await request('POST', '/projects/p1/members', { userId: 'u2' });
  console.log('Added members');

  // create tasks
  await request('POST', '/tasks', { id: 't1', title: 'Task One', description: 'First task', status: 'todo', projectId: 'p1' });
  await request('POST', '/tasks', { id: 't2', title: 'Task Two', description: 'Second task', status: 'todo', projectId: 'p1' });
  console.log('Created tasks');

  // assign t1 to u1
  await request('PUT', '/tasks/t1/assign', { assigneeId: 'u1' });
  console.log('Assigned t1 to u1');

  // change status t1 to in-progress
  await request('PUT', '/tasks/t1/status', { status: 'in-progress' });
  console.log('Changed status of t1 to in-progress');

  // add comment by u2 on t1
  await request('POST', '/comments', { id: 'c1', taskId: 't1', authorId: 'u2', body: 'Please update this', createdAt: new Date().toISOString() });
  console.log('Added comment c1');

  // fetch notifications for u1
  const notifs = await request('GET', '/notifications?userId=u1');
  console.log('Notifications for u1:', JSON.stringify(notifs.body, null, 2));

  // mark first notification as read
  if (Array.isArray(notifs.body) && notifs.body.length > 0) {
    const nid = notifs.body[0].id;
    await request('PUT', `/notifications/${nid}/read`);
    console.log('Marked first notification as read');
  }

  console.log('Demo complete');
  process.exit(0);
}

if (require.main === module) {
  runDemo().catch((e) => {
    console.error('Demo error', e);
    process.exit(1);
  });
}
