import { ApiRouter } from './router.js';
import { setTimeout as wait } from 'timers/promises';

async function demo() {
  const router = new ApiRouter();
  const server = router.listen(4000, () => console.log('Demo server running on http://localhost:4000'));

  // helper to make requests
  const make = async (method: string, path: string, body?: any) => {
    const url = `http://localhost:4000${path}`;
    const u = new URL(url);
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    return { status: res.status, data };
  };

  // 1. Create users
  const alice = (await make('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).data;
  const bob = (await make('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).data;
  console.log('Created users', alice, bob);

  // 2. Create project
  const project = (await make('POST', '/projects', { name: 'Demo Project', description: 'For demo' })).data;
  console.log('Created project', project);

  // 3. Add members
  await make('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await make('POST', `/projects/${project.id}/members`, { userId: bob.id });
  console.log('Added members');

  // 4. Create task
  const task = (await make('POST', '/tasks', { title: 'Initial Task', description: 'Do something', projectId: project.id })).data;
  console.log('Created task', task);

  // 5. Assign task to Bob
  await make('PUT', `/tasks/${task.id}/assign`, { assigneeId: bob.id });
  console.log('Assigned task to Bob');

  // 6. Change status to in-progress
  await make('PUT', `/tasks/${task.id}/status`, { status: 'in-progress' });
  console.log('Changed status to in-progress');

  // 7. Add comment by Alice
  await make('POST', '/comments', { taskId: task.id, authorId: alice.id, body: 'Please take a look' });
  console.log('Alice commented');

  // let events propagate
  await wait(200);

  // 8. Fetch Bob's notifications
  const notifs = (await make('GET', `/notifications?userId=${bob.id}`)).data;
  console.log('Bob notifications:', notifs);

  // cleanup
  server.close();
}

demo().catch((e) => console.error(e));
