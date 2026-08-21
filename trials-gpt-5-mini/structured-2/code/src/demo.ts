import { server } from './main';
import http from 'http';

function req(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = { method, host: 'localhost', port: 3000, path, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString() || '';
        try {
          const data = s ? JSON.parse(s) : undefined;
          resolve({ status: res.statusCode, body: data });
        } catch (err) {
          reject(err);
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runDemo() {
  console.log('Starting demo...');
  try {
    // create users
    await req('POST', '/users', { id: 'u1', name: 'Alice', email: 'alice@example.com' });
    await req('POST', '/users', { id: 'u2', name: 'Bob', email: 'bob@example.com' });

    // create project
    await req('POST', '/projects', { id: 'p1', name: 'Project 1', description: 'Demo project' });

    // add members
    await req('POST', '/projects/p1/members', { memberId: 'u1' });
    await req('POST', '/projects/p1/members', { memberId: 'u2' });

    // create tasks
    await req('POST', '/tasks', { id: 't1', title: 'Task One', projectId: 'p1' });
    await req('POST', '/tasks', { id: 't2', title: 'Task Two', projectId: 'p1' });

    // assign task t1 to u1
    await req('PUT', '/tasks/t1/assign', { assigneeId: 'u1' });

    // change status t1 to in-progress
    await req('PUT', '/tasks/t1/status', { status: 'in-progress' });

    // add comment to t1 by u2
    await req('POST', '/comments', { id: 'c1', taskId: 't1', authorId: 'u2', body: 'Please update this.' });

    // fetch notifications for u1
    const notifs = await req('GET', '/notifications?userId=u1');
    console.log('Notifications for u1:', JSON.stringify(notifs.body, null, 2));

    // mark first as read
    if (Array.isArray(notifs.body) && notifs.body.length > 0) {
      const nid = notifs.body[0].id;
      await req('PUT', `/notifications/${nid}/read`);
    }

    // fetch comments for t1
    const comments = await req('GET', '/comments?taskId=t1');
    console.log('Comments for t1:', JSON.stringify(comments.body, null, 2));

    console.log('Demo complete.');
  } catch (err) {
    console.error('Demo error', err);
  } finally {
    server.close();
  }
}

if (require.main === module) {
  // wait a bit for server to start
  setTimeout(() => runDemo(), 200);
}

export { runDemo };
