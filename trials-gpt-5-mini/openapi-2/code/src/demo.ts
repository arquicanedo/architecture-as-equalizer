import http from 'http';
import { APIRouter } from './router';

async function req(method: string, path: string, body?: any) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const opts: any = { hostname: 'localhost', port: 3000, path, method, headers: {} };
    if (data) opts.headers['Content-Type'] = 'application/json';
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        const b = d ? JSON.parse(d) : null;
        resolve({ status: res.statusCode || 0, body: b });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function runDemo() {
  const router = new APIRouter();
  const server = router.createServer();
  server.listen(3000);
  console.log('Demo server started');

  try {
    // create users
    const alice = (await req('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).body;
    const bob = (await req('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).body;
    console.log('Created users', alice, bob);

    // create project
    const project = (await req('POST', '/projects', { name: 'Proj', description: 'Demo project' })).body;
    console.log('Created project', project);

    // add members
    await req('POST', `/projects/${project.id}/members`, { userId: alice.id });
    await req('POST', `/projects/${project.id}/members`, { userId: bob.id });
    console.log('Added members');

    // create task
    const task = (await req('POST', '/tasks', { title: 'Task 1', description: 'Do stuff', projectId: project.id })).body;
    console.log('Created task', task);

    // assign task to Alice
    const assigned = (await req('PUT', `/tasks/${task.id}/assign`, { assigneeId: alice.id })).body;
    console.log('Assigned task', assigned);

    // change status to in-progress
    const inprog = (await req('PUT', `/tasks/${task.id}/status`, { status: 'in-progress' })).body;
    console.log('Status changed', inprog);

    // add comment by Bob
    const comment = (await req('POST', '/comments', { taskId: task.id, authorId: bob.id, body: 'Nice work' })).body;
    console.log('Added comment', comment);

    // list notifications for Alice and Bob
    const notifsAlice = (await req('GET', `/notifications?userId=${alice.id}`)).body;
    const notifsBob = (await req('GET', `/notifications?userId=${bob.id}`)).body;
    console.log('Notifications Alice', notifsAlice);
    console.log('Notifications Bob', notifsBob);

  } finally {
    server.close();
  }
}

if (require.main === module) {
  runDemo().catch((e) => console.error(e));
}
