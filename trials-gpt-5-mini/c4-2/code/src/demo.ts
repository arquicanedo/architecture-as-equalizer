import { start } from './router';
import http from 'http';

function req(options: any, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString('utf8');
        let parsed: any = undefined;
        try {
          if (s) parsed = JSON.parse(s);
        } catch (e) {
          return reject(e);
        }
        resolve({ status: res.statusCode ?? 0, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) {
      r.setHeader('Content-Type', 'application/json');
      r.write(JSON.stringify(body));
    }
    r.end();
  });
}

async function demo() {
  const { server, port } = await start(0);
  const base = { hostname: 'localhost', port };
  console.log('Demo server running on port', port);

  // Create users
  const u1 = await req({ ...base, path: '/users', method: 'POST' }, { name: 'Alice', email: 'alice@example.com' });
  console.log('Created user1', u1.body);
  const u2 = await req({ ...base, path: '/users', method: 'POST' }, { name: 'Bob', email: 'bob@example.com' });
  console.log('Created user2', u2.body);

  const user1 = u1.body;
  const user2 = u2.body;

  // Create project
  const p = await req({ ...base, path: '/projects', method: 'POST' }, { name: 'Demo Project', description: 'A demo' });
  console.log('Created project', p.body);
  const project = p.body;

  // Add members
  await req({ ...base, path: `/projects/${project.id}/members`, method: 'POST' }, { userId: user1.id });
  await req({ ...base, path: `/projects/${project.id}/members`, method: 'POST' }, { userId: user2.id });
  console.log('Added members to project');

  // Create task assigned to Alice
  const t = await req({ ...base, path: '/tasks', method: 'POST' }, { title: 'Task 1', description: 'First task', projectId: project.id, assigneeId: user1.id });
  console.log('Created task', t.body);
  const task = t.body;

  // Change status to in-progress
  await req({ ...base, path: `/tasks/${task.id}/status`, method: 'PUT' }, { status: 'in-progress' });
  console.log('Changed status to in-progress');

  // Add a comment by Bob
  await req({ ...base, path: '/comments', method: 'POST' }, { taskId: task.id, authorId: user2.id, body: 'Please update this.' });
  console.log('Bob added comment');

  // Check notifications for Alice
  const notes = await req({ ...base, path: `/notifications?userId=${user1.id}`, method: 'GET' });
  console.log('Alice notifications:', notes.body);

  // Mark first notification as read
  if (Array.isArray(notes.body) && notes.body.length > 0) {
    const n = notes.body[0];
    await req({ ...base, path: `/notifications/${n.id}/read`, method: 'PUT' });
    console.log('Marked notification read');
  }

  // final notifications
  const notes2 = await req({ ...base, path: `/notifications?userId=${user1.id}`, method: 'GET' });
  console.log('Alice notifications after read:', notes2.body);

  server.close();
}

if (require.main === module) {
  demo().catch((err) => {
    console.error('Demo error', err);
    process.exit(1);
  });
}
