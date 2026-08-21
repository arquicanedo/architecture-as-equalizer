import { buildServer } from './router';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import * as http from 'http';

async function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options: import('http').RequestOptions = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
      },
    };
    const req = http.request(options, (res: import('http').IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const json = raw ? JSON.parse(raw) : {};
        resolve({ status: (res as any).statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  const bus = new EventBus();
  const services = {
    users: new UserService(),
    projects: new ProjectService(),
    tasks: new TaskService(bus),
    comments: new CommentService(bus),
    notifications: new NotificationService(bus),
  };
  const server = buildServer(services);
  await new Promise<void>((resolve) => (server as any).listen(3001, resolve));
  console.log('Demo server started on port 3001');

  // Create users
  const u1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const u2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users created:', u1.body, u2.body);

  // Create project
  const proj = await request('POST', '/projects', { name: 'Demo Project', description: 'A test project' });
  console.log('Project created:', proj.body);

  // Add members
  await request('POST', `/projects/${proj.body.id}/members`, { userId: u1.body.id });
  await request('POST', `/projects/${proj.body.id}/members`, { userId: u2.body.id });
  const projAfterMembers = await request('GET', `/projects/${proj.body.id}`);
  console.log('Project after members:', projAfterMembers.body);

  // Create tasks
  const t1 = await request('POST', '/tasks', { title: 'Setup repo', projectId: proj.body.id });
  const t2 = await request('POST', '/tasks', { title: 'Implement feature', projectId: proj.body.id });
  console.log('Tasks created:', t1.body, t2.body);

  // Assign tasks
  const t1Assigned = await request('PUT', `/tasks/${t1.body.id}/assign`, { assigneeId: u1.body.id });
  const t2Assigned = await request('PUT', `/tasks/${t2.body.id}/assign`, { assigneeId: u2.body.id });
  console.log('Tasks assigned:', t1Assigned.body, t2Assigned.body);

  // Change status
  const t1InProgress = await request('PUT', `/tasks/${t1.body.id}/status`, { status: 'in-progress' });
  const t1Done = await request('PUT', `/tasks/${t1.body.id}/status`, { status: 'done' });
  console.log('Task status updates:', t1InProgress.body, t1Done.body);

  // Add comments
  const c1 = await request('POST', '/comments', { taskId: t1.body.id, authorId: u2.body.id, body: 'Looks good!' });
  const c2 = await request('POST', '/comments', { taskId: t2.body.id, authorId: u1.body.id, body: 'Starting now' });
  console.log('Comments added:', c1.body, c2.body);

  // Check notifications
  const n1 = await request('GET', `/notifications?userId=${u1.body.id}`);
  const n2 = await request('GET', `/notifications?userId=${u2.body.id}`);
  console.log('Notifications:', n1.body, n2.body);

  // Mark one as read
  if (Array.isArray(n1.body) && n1.body.length > 0) {
    const first = n1.body[0];
    const n1read = await request('PUT', `/notifications/${first.id}/read`);
    console.log('Marked read:', n1read.body);
  }

  (server as any).close();
}

runDemo().catch((err) => {
  console.error('Demo error', err);
});
