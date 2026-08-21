import http from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createApiServer } from './router';

function request(method: string, path: string, body?: any): Promise<any> {
  const payload = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path,
        method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': payload ? Buffer.byteLength(payload) : 0 },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(raw ? JSON.parse(raw) : undefined);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runDemo() {
  const bus = new EventBus();
  const userSvc = new UserService();
  const projectSvc = new ProjectService();
  const taskSvc = new TaskService(bus);
  const getTaskTitle = (taskId: string) => taskSvc.getById(taskId)?.title;
  const getUserName = (userId: string) => userSvc.getById(userId)?.name;
  const getTaskAssignee = (taskId: string) => taskSvc.getById(taskId)?.assigneeId;
  const commentSvc = new CommentService(bus, getTaskTitle, getUserName);
  const notifSvc = new NotificationService(bus, getTaskAssignee);

  const server = createApiServer(userSvc, projectSvc, taskSvc, commentSvc, notifSvc);
  await new Promise<void>((resolve) => server.listen(3001, resolve));
  console.log('Demo server started on http://localhost:3001');

  // 1. Create users
  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users:', await request('GET', '/users'));

  // 2. Create project
  const project = await request('POST', '/projects', { name: 'Demo Project', description: 'A sample project' });
  console.log('Project created:', project);

  // 3. Add members
  await request('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${project.id}/members`, { userId: bob.id });
  console.log('Project after members:', await request('GET', `/projects/${project.id}`));

  // 4. Create tasks
  const task1 = await request('POST', '/tasks', { title: 'Set up repo', projectId: project.id });
  const task2 = await request('POST', '/tasks', { title: 'Implement feature', projectId: project.id });
  console.log('Tasks in project:', await request('GET', `/tasks?projectId=${project.id}`));

  // 5. Assign tasks
  await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: alice.id });
  await request('PUT', `/tasks/${task2.id}/assign`, { assigneeId: bob.id });

  // 6. Change status
  await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });

  // 7. Add comments
  await request('POST', '/comments', { taskId: task1.id, authorId: bob.id, body: 'Looks good!' });
  await request('POST', '/comments', { taskId: task2.id, authorId: alice.id, body: 'Please add tests.' });

  // 8. Check notifications
  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`);
  console.log('Alice notifications:', aliceNotifs);
  console.log('Bob notifications:', bobNotifs);

  // Mark first notification for Alice as read
  if (aliceNotifs[0]) {
    await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('Alice notifications after read:', await request('GET', `/notifications?userId=${alice.id}`));
  }

  server.close();
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
