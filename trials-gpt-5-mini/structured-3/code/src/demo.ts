import router from './main';
import { request as httpRequest } from 'http';

function req(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const opts = { method, port: 3000, path, headers: { 'Content-Type': 'application/json' } } as any;
    const r = httpRequest(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString();
        try {
          resolve(s ? JSON.parse(s) : null);
        } catch (err) {
          resolve(s);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  console.log('Demo starting...');
  // create users
  const u1 = await req('POST', '/users', { id: 'u1', name: 'Alice', email: 'alice@example.com' });
  const u2 = await req('POST', '/users', { id: 'u2', name: 'Bob', email: 'bob@example.com' });
  console.log('Created users', u1, u2);

  // create project
  const p = await req('POST', '/projects', { id: 'p1', name: 'Project 1', description: 'Demo project', memberIds: [] });
  console.log('Created project', p);

  // add members
  await req('POST', '/projects/p1/members', { userId: 'u1' });
  await req('POST', '/projects/p1/members', { userId: 'u2' });
  console.log('Added members');

  // create task
  const t = await req('POST', '/tasks', { id: 't1', title: 'Task 1', description: 'Do things', status: 'todo', projectId: 'p1' });
  console.log('Created task', t);

  // assign task
  const assigned = await req('PUT', '/tasks/t1/assign', { assigneeId: 'u1' });
  console.log('Assigned task', assigned);

  // change status
  const moved = await req('PUT', '/tasks/t1/status', { status: 'in-progress' });
  console.log('Changed status', moved);

  // add comment
  const c = await req('POST', '/comments', { id: 'c1', taskId: 't1', authorId: 'u2', body: 'Please update' });
  console.log('Added comment', c);

  // get notifications for u1
  const notes = await req('GET', '/notifications?userId=u1');
  console.log('Notifications for u1', notes);

  // mark first notification as read
  if (notes && notes[0]) {
    await req('PUT', `/notifications/${notes[0].id}/read`);
    console.log('Marked first notification as read');
  }

  // final notifications
  const notes2 = await req('GET', '/notifications?userId=u1');
  console.log('Final notifications for u1', notes2);

  // shutdown
  process.exit(0);
}

// give server a moment to start
setTimeout(run, 200);
