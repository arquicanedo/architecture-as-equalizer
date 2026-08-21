import http from 'http';
import { createServer } from './router';

function req(method: string, path: string, body?: any): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const opts: any = { method, port: 3000, path, hostname: 'localhost', headers: {} };
    const data = body ? JSON.stringify(body) : undefined;
    if (data) opts.headers['Content-Type'] = 'application/json';
    const r = http.request(opts, (res) => {
      let s = '';
      res.on('data', (c) => (s += c));
      res.on('end', () => {
        const b = s ? JSON.parse(s) : null;
        resolve({ status: res.statusCode || 0, body: b, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function runDemo() {
  const server = createServer();
  server.listen(3000);
  console.log('Demo server started on 3000');

  // create users
  const u1 = (await req('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).body;
  const u2 = (await req('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).body;
  console.log('Created users', u1, u2);

  // create project
  const p = (await req('POST', '/projects', { name: 'Project X', description: 'Top secret' })).body;
  console.log('Created project', p);

  // add members
  await req('POST', `/projects/${p.id}/members`, { userId: u1.id });
  await req('POST', `/projects/${p.id}/members`, { userId: u2.id });
  const proj = (await req('GET', `/projects/${p.id}`)).body;
  console.log('Project after adding members', proj);

  // create task
  const t = (await req('POST', '/tasks', { title: 'Do thing', description: 'Important', projectId: p.id })).body;
  console.log('Created task', t);

  // assign task to Bob
  const t2 = (await req('PUT', `/tasks/${t.id}/assign`, { assigneeId: u2.id })).body;
  console.log('Assigned task', t2);

  // change status to in-progress
  const t3 = (await req('PUT', `/tasks/${t.id}/status`, { status: 'in-progress' })).body;
  console.log('Status changed', t3);

  // add comment by Alice
  const c = (await req('POST', '/comments', { taskId: t.id, authorId: u1.id, body: 'Please do this soon', authorName: u1.name, taskTitle: t.title })).body;
  console.log('Added comment', c);

  // give some time for async notifications
  await sleep(100);

  // list notifications for Bob
  const notifsBob = (await req('GET', `/notifications?userId=${u2.id}`)).body;
  console.log('Bob notifications', notifsBob);

  // list notifications for Alice
  const notifsAlice = (await req('GET', `/notifications?userId=${u1.id}`)).body;
  console.log('Alice notifications', notifsAlice);

  server.close();
}

if (require.main === module) {
  runDemo().catch((e) => console.error(e));
}
