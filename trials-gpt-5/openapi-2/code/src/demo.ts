import { createServer } from './router';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import http from 'http';

// Helper to perform HTTP requests
function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({ hostname: 'localhost', port: 3001, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 } }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        if (raw.length === 0) return resolve(undefined);
        try { resolve(JSON.parse(raw)); } catch (e) { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService();
  const commentService = new CommentService();
  const notificationService = new NotificationService();

  const server = createServer({ userService, projectService, taskService, commentService, notificationService });
  await new Promise<void>((resolve) => server.listen(3001, resolve));
  console.log('Demo server started on http://localhost:3001');

  // Create users
  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users created:', alice, bob);

  // Create project
  const proj = await request('POST', '/projects', { name: 'Apollo', description: 'Moon mission' });
  console.log('Project created:', proj);

  // Add members
  await request('POST', `/projects/${proj.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${proj.id}/members`, { userId: bob.id });
  const updatedProj = await request('GET', `/projects/${proj.id}`);
  console.log('Project members updated:', updatedProj);

  // Create tasks
  const t1 = await request('POST', '/tasks', { title: 'Design module', description: 'Design lunar module', projectId: proj.id });
  const t2 = await request('POST', '/tasks', { title: 'Build module', description: 'Build lunar module', projectId: proj.id });
  console.log('Tasks created:', t1, t2);

  // Assign tasks
  await request('PUT', `/tasks/${t1.id}/assign`, { assigneeId: alice.id });
  await request('PUT', `/tasks/${t2.id}/assign`, { assigneeId: bob.id });

  // Change status forward
  await request('PUT', `/tasks/${t1.id}/status`, { status: 'in-progress' });
  await request('PUT', `/tasks/${t1.id}/status`, { status: 'done' });

  // Add comments
  await request('POST', '/comments', { taskId: t1.id, authorId: alice.id, body: 'Initial design doc uploaded.' });
  await request('POST', '/comments', { taskId: t1.id, authorId: bob.id, body: 'Reviewed and approved.' });

  // Check notifications
  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`);
  console.log('Alice notifications:', aliceNotifs);
  console.log('Bob notifications:', bobNotifs);

  // Mark first notification as read
  if (aliceNotifs[0]) {
    const updated = await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('Marked Alice notification as read:', updated);
  }

  // List tasks by project
  const tasksByProject = await request('GET', `/tasks?projectId=${proj.id}`);
  console.log('Tasks by project:', tasksByProject);

  // List comments by task
  const comments = await request('GET', `/comments?taskId=${t1.id}`);
  console.log('Comments for t1:', comments);

  server.close();
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
