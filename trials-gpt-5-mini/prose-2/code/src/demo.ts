import { ApiServer } from './router';
import http from 'http';

function req(opts: { method: string; path: string; body?: any }) {
  return new Promise<any>((resolve, reject) => {
    const data = opts.body ? JSON.stringify(opts.body) : undefined;
    const r = http.request(
      { hostname: 'localhost', port: 3000, path: opts.path, method: opts.method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let s = '';
        res.on('data', (c) => (s += c));
        res.on('end', () => {
          try {
            const parsed = s ? JSON.parse(s) : undefined;
            resolve(parsed);
          } catch (err) {
            resolve(s);
          }
        });
      }
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const server = new ApiServer();
  const srv = server.createServer(3000);
  console.log('Demo server running on 3000');
  // wait a bit
  await new Promise((r) => setTimeout(r, 200));

  console.log('Creating users...');
  const alice = await req({ method: 'POST', path: '/users', body: { name: 'Alice', email: 'alice@example.com' } });
  const bob = await req({ method: 'POST', path: '/users', body: { name: 'Bob', email: 'bob@example.com' } });
  console.log('Users:', alice, bob);

  console.log('Creating project...');
  const proj = await req({ method: 'POST', path: '/projects', body: { name: 'Project X', description: 'Top secret' } });
  console.log('Project:', proj);

  console.log('Adding members...');
  await req({ method: 'POST', path: `/projects/${proj.id}/members`, body: { userId: alice.id } });
  await req({ method: 'POST', path: `/projects/${proj.id}/members`, body: { userId: bob.id } });

  console.log('Creating task...');
  const task = await req({ method: 'POST', path: '/tasks', body: { title: 'Design UI', projectId: proj.id, description: 'Make it pretty' } });
  console.log('Task:', task);

  console.log('Assigning task to Bob...');
  const assigned = await req({ method: 'PUT', path: `/tasks/${task.id}/assign`, body: { userId: bob.id } });
  console.log('Assigned:', assigned);

  console.log('Adding comment by Alice...');
  const comment = await req({ method: 'POST', path: '/comments', body: { taskId: task.id, authorId: alice.id, body: 'Please consider accessibility' } });
  console.log('Comment:', comment);

  console.log('Listing notifications for Bob...');
  const notes = await req({ method: 'GET', path: `/notifications?userId=${bob.id}` });
  console.log('Bob notifications:', notes);

  console.log('Marking first notification read...');
  if (notes && notes[0]) await req({ method: 'PUT', path: `/notifications/${notes[0].id}/read` });
  const notes2 = await req({ method: 'GET', path: `/notifications?userId=${bob.id}` });
  console.log('Bob notifications after read:', notes2);

  console.log('Demo complete. Shutting down server.');
  srv.close();
}

if (require.main === module) {
  run().catch((e) => console.error(e));
}
