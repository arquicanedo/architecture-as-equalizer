import { createServer } from 'http';
import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { ApiRouter } from './router';
import { request } from 'http';

function httpRequest(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks: any[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch (e) {
            resolve({});
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  console.log('Starting demo...');

  // Create users
  const alice = await httpRequest('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await httpRequest('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users created:', alice, bob);

  // Create project
  const project = await httpRequest('POST', '/projects', { name: 'Project X', description: 'Top secret' });
  console.log('Project created:', project);

  // Add members
  await httpRequest('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await httpRequest('POST', `/projects/${project.id}/members`, { userId: bob.id });
  const projectAfterMembers = await httpRequest('GET', `/projects/${project.id}`);
  console.log('Project members:', projectAfterMembers.members);

  // Create task and assign to Alice
  const task1 = await httpRequest('POST', '/tasks', { title: 'Setup repo', description: 'Initialize repository', projectId: project.id, assignee: alice.id });
  console.log('Task created:', task1);

  // Update task status to in-progress, then done
  const task1InProgress = await httpRequest('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  console.log('Task in-progress:', task1InProgress.status);
  const task1Done = await httpRequest('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
  console.log('Task done:', task1Done.status);

  // Add comment by Bob on Alice's task
  const comment = await httpRequest('POST', '/comments', { taskId: task1.id, authorId: bob.id, body: 'Looks good!' });
  console.log('Comment added:', comment);

  // Check notifications for Alice
  const aliceNotifs = await httpRequest('GET', `/notifications?userId=${alice.id}`);
  console.log('Alice notifications:', aliceNotifs);

  // Mark first notification read
  if (aliceNotifs.length > 0) {
    const first = aliceNotifs[0];
    const updated = await httpRequest('PUT', `/notifications/${first.id}/read`);
    console.log('Marked read:', updated);
  }

  // Reassign task to Bob
  const reassigned = await httpRequest('PUT', `/tasks/${task1.id}/assign`, { userId: bob.id });
  console.log('Task reassigned:', reassigned.assignee);

  // Bob comments on his own task
  const comment2 = await httpRequest('POST', '/comments', { taskId: task1.id, authorId: bob.id, body: 'Taking over.' });
  console.log('Second comment:', comment2);

  const bobNotifs = await httpRequest('GET', `/notifications?userId=${bob.id}`);
  console.log('Bob notifications:', bobNotifs);

  console.log('Demo complete.');
}

async function main() {
  // Start server
  const bus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(bus);
  const commentService = new CommentService(bus);
  const notificationService = new NotificationService(bus);
  const router = new ApiRouter(bus, userService, projectService, taskService, commentService, notificationService);

  const server = createServer((req, res) => router.handle(req, res));
  await new Promise<void>((resolve) => server.listen(3000, resolve));
  console.log('Server started for demo on http://localhost:3000');

  try {
    await runDemo();
  } catch (e) {
    console.error('Demo error:', e);
  } finally {
    server.close(() => console.log('Server closed.'));
  }
}

main();
