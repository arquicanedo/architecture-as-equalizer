import http from 'http';
import { APIRouter } from './router';

function req(options: { method?: string; path: string; body?: any }) {
  const method = options.method ?? 'GET';
  const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
  return new Promise<any>((resolve, reject) => {
    const request = http.request({ hostname: 'localhost', port: 3000, path: options.path, method, headers: { 'Content-Type': 'application/json' } }, (res: any) => {
      let s = '';
      res.on('data', (c: any) => s += c);
      res.on('end', () => {
        try { resolve(s ? JSON.parse(s) : null); } catch (e) { resolve(s); }
      });
    });
    request.on('error', reject);
    if (bodyStr) request.write(bodyStr);
    request.end();
  });
}

async function main() {
  const router = new APIRouter();
  router.listen(3000);
  await new Promise(r => setTimeout(r, 50));
  console.log('Demo server started on port 3000');

  // create users
  const alice = await req({ method: 'POST', path: '/users', body: { name: 'Alice', email: 'alice@example.com' } });
  const bob = await req({ method: 'POST', path: '/users', body: { name: 'Bob', email: 'bob@example.com' } });
  console.log('Users:', alice, bob);

  // create project
  const project = await req({ method: 'POST', path: '/projects', body: { name: 'Project X', description: 'Top secret' } });
  console.log('Project:', project);

  // add members
  await req({ method: 'POST', path: `/projects/${project.id}/members`, body: { userId: alice.id } });
  await req({ method: 'POST', path: `/projects/${project.id}/members`, body: { userId: bob.id } });
  const projAfter = await req({ method: 'GET', path: `/projects/${project.id}` });
  console.log('Project after members:', projAfter);

  // create task assigned to Alice
  const task = await req({ method: 'POST', path: '/tasks', body: { title: 'Setup repo', description: 'Init git', projectId: project.id, assigneeId: alice.id } });
  console.log('Task created:', task);

  // change status to in-progress
  await req({ method: 'PUT', path: `/tasks/${task.id}/status`, body: { newStatus: 'in-progress' } });
  // change status to done
  await req({ method: 'PUT', path: `/tasks/${task.id}/status`, body: { newStatus: 'done' } });

  // add comment by Bob
  await req({ method: 'POST', path: '/comments', body: { taskId: task.id, authorId: bob.id, body: 'Please add README', authorName: 'Bob', taskTitle: task.title, assigneeId: task.assigneeId } });

  // fetch notifications for Alice
  const notes = await req({ method: 'GET', path: `/notifications?userId=${alice.id}` });
  console.log('Notifications for Alice:', notes);

  // mark first as read
  if (notes && notes.length) {
    await req({ method: 'PUT', path: `/notifications/${notes[0].id}/read` });
  }

  const notesAfter = await req({ method: 'GET', path: `/notifications?userId=${alice.id}` });
  console.log('Notifications after marking read:', notesAfter);

  console.log('Demo complete');
  process.exit(0);
}

if (typeof require !== 'undefined' && require.main === module) main();
