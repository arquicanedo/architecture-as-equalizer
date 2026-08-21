import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createServer } from './router';
import http from 'http';

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({ hostname: 'localhost', port: 3001, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 } }, (res: any) => {
      const chunks: any[] = [];
      res.on('data', (c: any) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks as any).toString('utf8');
        if (!raw) return resolve(undefined);
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDemo() {
  const bus = new EventBus();
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(bus);
  const commentService = new CommentService(bus, {
    getTaskTitle: (taskId: string) => taskService.getById(taskId)?.title,
    getUserName: (userId: string) => userService.getById(userId)?.name,
  });
  const notificationService = new NotificationService(bus, {
    getTaskAssigneeId: (taskId: string) => taskService.getById(taskId)?.assigneeId,
  });

  const server = createServer({ userService, projectService, taskService, commentService, notificationService });
  await new Promise<void>((resolve) => server.listen(3001, resolve));
  console.log('Demo server started on http://localhost:3001');

  // Create users
  const alice = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  const bob = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  console.log('Users created:', alice, bob);

  // Create project
  const project = await request('POST', '/projects', { name: 'Build API', description: 'Task management API' });
  console.log('Project created:', project);

  // Add members
  await request('POST', `/projects/${project.id}/members`, { userId: alice.id });
  await request('POST', `/projects/${project.id}/members`, { userId: bob.id });
  const updatedProject = await request('GET', `/projects/${project.id}`);
  console.log('Project members:', updatedProject.memberIds);

  // Create tasks
  const t1 = await request('POST', '/tasks', { title: 'Design', description: 'Design the system', projectId: project.id });
  const t2 = await request('POST', '/tasks', { title: 'Implement', description: 'Code the system', projectId: project.id });
  console.log('Tasks created:', t1, t2);

  // Assign tasks
  await request('PUT', `/tasks/${t1.id}/assign`, { assigneeId: alice.id });
  await request('PUT', `/tasks/${t2.id}/assign`, { assigneeId: bob.id });
  console.log('Tasks assigned');

  // Change status
  await request('PUT', `/tasks/${t1.id}/status`, { status: 'in-progress' });
  await request('PUT', `/tasks/${t1.id}/status`, { status: 'done' });
  console.log('Task 1 progressed to done');

  // Add comments
  await request('POST', '/comments', { taskId: t1.id, authorId: bob.id, body: 'Looks good!' });
  await request('POST', '/comments', { taskId: t2.id, authorId: alice.id, body: 'I can help' });
  console.log('Comments added');

  // Check notifications
  // Allow event loop to process async event bus callbacks
  await new Promise((r) => setTimeout(r, 50));
  const aliceNotifs = await request('GET', `/notifications?userId=${alice.id}`);
  const bobNotifs = await request('GET', `/notifications?userId=${bob.id}`);
  console.log('Alice notifications:', aliceNotifs);
  console.log('Bob notifications:', bobNotifs);

  // Mark first Alice notification as read
  if (aliceNotifs && aliceNotifs.length > 0) {
    const n = await request('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    console.log('Marked as read:', n);
  }

  // List tasks by project
  const projectTasks = await request('GET', `/tasks?projectId=${project.id}`);
  console.log('Tasks by project:', projectTasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status })));

  server.close();
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
