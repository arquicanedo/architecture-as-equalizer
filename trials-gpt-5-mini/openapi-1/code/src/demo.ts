import http from 'http';
import { Router } from './router';

function request(method: string, path: string, body?: any) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const opts: http.RequestOptions = { method, host: 'localhost', port: 3000, path, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, (res) => {
      const chunks: Uint8Array[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString();
        const b = s ? JSON.parse(s) : null;
        resolve({ status: res.statusCode ?? 0, body: b });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDemo() {
  const router = new Router();
  const server = http.createServer(router.handler);
  server.listen(3000);
  console.log('Demo server started on port 3000');

  // create users
  const u1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const u2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Created users', u1.body, u2.body);

  // create project
  const p = await request('POST', '/projects', { name: 'Demo Project', description: 'A demo' });
  console.log('Created project', p.body);

  // add members
  await request('POST', `/projects/${p.body.id}/members`, { userId: u1.body.id });
  await request('POST', `/projects/${p.body.id}/members`, { userId: u2.body.id });
  console.log('Added members');

  // create task
  const t = await request('POST', '/tasks', { title: 'Do stuff', description: 'Important', projectId: p.body.id });
  console.log('Created task', t.body);

  // assign task to Alice
  await request('PUT', `/tasks/${t.body.id}/assign`, { assigneeId: u1.body.id });
  console.log('Assigned task to Alice');

  // change status
  await request('PUT', `/tasks/${t.body.id}/status`, { status: 'in-progress' });
  await request('PUT', `/tasks/${t.body.id}/status`, { status: 'done' });
  console.log('Advanced task status to done');

  // add comment
  const c = await request('POST', '/comments', { taskId: t.body.id, authorId: u2.body.id, body: 'Nice work' });
  console.log('Added comment', c.body);

  // fetch notifications for Alice and Bob
  const na = await request('GET', `/notifications?userId=${u1.body.id}`);
  const nb = await request('GET', `/notifications?userId=${u2.body.id}`);
  console.log('Alice notifications', na.body);
  console.log('Bob notifications', nb.body);

  // cleanup
  server.close();
}

if (require.main === module) {
  runDemo().catch((e) => { console.error(e); process.exit(1); });
}
