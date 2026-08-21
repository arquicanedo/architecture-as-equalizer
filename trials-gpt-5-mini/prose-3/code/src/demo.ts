import http from 'http';
import { server, users, projects, tasks, comments, notifications } from './main';

function req(opts: { method: string; path: string; body?: any }) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const bodyStr = opts.body ? JSON.stringify(opts.body) : '';
    const r = http.request({ hostname: 'localhost', port: 3000, path: opts.path, method: opts.method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } }, (res) => {
      const chunks: Uint8Array[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString('utf8');
        try {
          const parsed = s ? JSON.parse(s) : null;
          resolve({ status: res.statusCode || 0, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode || 0, body: s });
        }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

async function runDemo() {
  console.log('Starting demo...');
  // create users
  const u1 = await req({ method: 'POST', path: '/users', body: { name: 'Alice', email: 'alice@example.com' } });
  const u2 = await req({ method: 'POST', path: '/users', body: { name: 'Bob', email: 'bob@example.com' } });
  console.log('Created users', u1.body, u2.body);

  // create project
  const p = await req({ method: 'POST', path: '/projects', body: { name: 'Demo Project', description: 'Project for demo' } });
  console.log('Created project', p.body);

  // add members
  await req({ method: 'POST', path: `/projects/${p.body.id}/members`, body: { userId: u1.body.id } });
  await req({ method: 'POST', path: `/projects/${p.body.id}/members`, body: { userId: u2.body.id } });
  console.log('Added members');

  // create task
  const t = await req({ method: 'POST', path: '/tasks', body: { title: 'Initial task', description: 'Do the thing', projectId: p.body.id } });
  console.log('Created task', t.body);

  // assign to Alice
  await req({ method: 'PUT', path: `/tasks/${t.body.id}/assign`, body: { userId: u1.body.id } });
  console.log('Assigned task to Alice');

  // add comment by Bob
  await req({ method: 'POST', path: '/comments', body: { taskId: t.body.id, authorId: u2.body.id, body: 'Please update this.' } });
  console.log('Bob commented');

  // change status to in-progress
  await req({ method: 'PUT', path: `/tasks/${t.body.id}/status`, body: { status: 'in-progress' } });
  console.log('Task status updated to in-progress');

  // fetch notifications for Alice
  const notes = await req({ method: 'GET', path: `/notifications?userId=${u1.body.id}` });
  console.log('Notifications for Alice:', notes.body);

  // mark first notification read
  if (notes.body && notes.body.length > 0) {
    const nid = notes.body[0].id;
    await req({ method: 'PUT', path: `/notifications/${nid}/read` });
    console.log('Marked notification read');
  }

  console.log('Demo complete.');
  server.close();
}

if (require.main === module) {
  // give server a moment to start
  setTimeout(() => {
    runDemo().catch((e) => console.error(e));
  }, 200);
}
