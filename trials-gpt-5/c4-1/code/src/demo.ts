import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService, TaskStatus } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createHttpServer } from './router';
import http from 'http';

const PORT = 3001;

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data ? Buffer.byteLength(data) : 0,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            const json = text ? JSON.parse(text) : undefined;
            resolve({ status: res.statusCode, body: json });
          } catch (e) {
            resolve({ status: res.statusCode, body: text });
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
  // Start in-memory server
  const eventBus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const getTaskTitle = (taskId: string) => taskService.getById(taskId)?.title;
  const getUserName = (userId: string) => userService.getById(userId)?.name;
  const commentService = new CommentService(eventBus, getTaskTitle, getUserName);
  const notificationService = new NotificationService(eventBus);
  const server = createHttpServer({ userService, projectService, taskService, commentService, notificationService });
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Demo server on http://localhost:${PORT}`);

  // Create users
  const u1 = (await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).body;
  const u2 = (await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).body;
  console.log('Users created:', u1, u2);

  // Create project
  const project = (await request('POST', '/projects', { name: 'Project X', description: 'Top secret' })).body;
  console.log('Project created:', project);

  // Add members
  await request('POST', `/projects/${project.id}/members`, { userId: u1.id });
  await request('POST', `/projects/${project.id}/members`, { userId: u2.id });
  console.log('Members added');

  // Create tasks
  const t1 = (await request('POST', '/tasks', { title: 'Design UI', description: 'Create mockups', projectId: project.id })).body;
  const t2 = (await request('POST', '/tasks', { title: 'Implement API', description: 'Build endpoints', projectId: project.id })).body;
  console.log('Tasks created:', t1, t2);

  // Assign tasks
  await request('PUT', `/tasks/${t1.id}/assign`, { assigneeId: u1.id });
  await request('PUT', `/tasks/${t2.id}/assign`, { assigneeId: u2.id });
  console.log('Tasks assigned');

  // Change status
  await request('PUT', `/tasks/${t1.id}/status`, { status: 'in-progress' as TaskStatus });
  await request('PUT', `/tasks/${t1.id}/status`, { status: 'done' as TaskStatus });
  console.log('Task status changed');

  // Add comments
  await request('POST', '/comments', { taskId: t1.id, authorId: u2.id, body: 'Looks great!' });
  await request('POST', '/comments', { taskId: t2.id, authorId: u1.id, body: 'API endpoints ready?' });
  console.log('Comments added');

  // Check notifications
  const n1 = await request('GET', `/notifications?userId=${u1.id}`);
  const n2 = await request('GET', `/notifications?userId=${u2.id}`);
  console.log('Notifications for Alice:', n1.body);
  console.log('Notifications for Bob:', n2.body);

  // Mark first notification as read for Alice if exists
  if (n1.body && n1.body.length > 0) {
    const notifId = n1.body[0].id;
    await request('PUT', `/notifications/${notifId}/read`);
    const n1b = await request('GET', `/notifications?userId=${u1.id}`);
    console.log('Notifications for Alice after markAsRead:', n1b.body);
  }

  server.close();
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
