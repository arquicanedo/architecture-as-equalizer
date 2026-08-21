/**
 * demo.ts — End-to-end demonstration of the Task Management API.
 *
 * Starts the HTTP server, runs through all major features, and then shuts down.
 * Run with:  npx tsx src/demo.ts
 */

import * as http from 'http';
import { IncomingMessage } from 'http';
import { EventBus } from './event-bus';
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { TaskService } from './task-service';
import { CommentService } from './comment-service';
import { NotificationService } from './notification-service';
import { Router } from './router';

// ─── Spin up a fresh server just for the demo ─────────────────────────────────

const PORT = 3001;

const eventBus = new EventBus();
const userService = new UserService();
const projectService = new ProjectService();
const taskService = new TaskService(eventBus);
const commentService = new CommentService(eventBus);
const notificationService = new NotificationService(eventBus);

const router = new Router(
  userService,
  projectService,
  taskService,
  commentService,
  notificationService
);

const server = http.createServer((req, res) => {
  router.handle(req, res).catch((err) => {
    console.error('[Demo Server] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error.' }));
    }
  });
});

// ─── HTTP client helper ───────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res: IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) as T });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: data as unknown as T });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';

function header(title: string): void {
  console.log(`\n${BOLD}${CYAN}${'─'.repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${'─'.repeat(60)}${RESET}`);
}

function log(label: string, data: unknown): void {
  console.log(`${BOLD}${YELLOW}▶ ${label}${RESET}`);
  console.log(JSON.stringify(data, null, 2));
}

function ok(label: string): void {
  console.log(`${GREEN}✔ ${label}${RESET}`);
}

function fail(label: string, detail: unknown): void {
  console.log(`${RED}✘ ${label}${RESET}`);
  console.log(detail);
}

function assert(condition: boolean, label: string, detail?: unknown): void {
  if (condition) {
    ok(label);
  } else {
    fail(label, detail);
  }
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  // ── 1. Users ──────────────────────────────────────────────────────────────
  header('1. Users');

  const alice = (await request<any>('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).body;
  log('Created user Alice', alice);
  assert(alice.id !== undefined, 'Alice has an ID');

  const bob = (await request<any>('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).body;
  log('Created user Bob', bob);

  const carol = (await request<any>('POST', '/users', { name: 'Carol', email: 'carol@example.com' })).body;
  log('Created user Carol', carol);

  const users = (await request<any[]>('GET', '/users')).body;
  assert(users.length === 3, `GET /users returns 3 users (got ${users.length})`);

  const aliceFetched = (await request<any>('GET', `/users/${alice.id}`)).body;
  assert(aliceFetched.name === 'Alice', `GET /users/${alice.id} returns Alice`);

  const aliceUpdated = (await request<any>('PUT', `/users/${alice.id}`, { name: 'Alice Smith' })).body;
  assert(aliceUpdated.name === 'Alice Smith', 'PUT /users/:id updates name');

  // Duplicate email rejection
  const dupEmail = (await request<any>('POST', '/users', { name: 'Dup', email: 'bob@example.com' }));
  assert(dupEmail.status === 400, 'Duplicate email rejected (400)');

  // ── 2. Projects ───────────────────────────────────────────────────────────
  header('2. Projects');

  const project = (await request<any>('POST', '/projects', {
    name: 'Apollo',
    description: 'Mission to the moon',
  })).body;
  log('Created project Apollo', project);
  assert(project.id !== undefined, 'Project has an ID');

  // Add members
  const addAlice = await request<any>('POST', `/projects/${project.id}/members`, { userId: alice.id });
  assert(addAlice.status === 200, 'Alice added to project');
  const addBob = await request<any>('POST', `/projects/${project.id}/members`, { userId: bob.id });
  assert(addBob.status === 200, 'Bob added to project');

  const projectFetched = (await request<any>('GET', `/projects/${project.id}`)).body;
  assert(projectFetched.memberIds.length === 2, 'Project now has 2 members');

  // Remove a member
  await request<any>('DELETE', `/projects/${project.id}/members`, { userId: bob.id });
  const projectAfterRemove = (await request<any>('GET', `/projects/${project.id}`)).body;
  assert(projectAfterRemove.memberIds.length === 1, 'Project now has 1 member after removal');

  // Add Bob back
  await request<any>('POST', `/projects/${project.id}/members`, { userId: bob.id });

  // ── 3. Tasks ──────────────────────────────────────────────────────────────
  header('3. Tasks');

  const task1 = (await request<any>('POST', '/tasks', {
    title: 'Design landing module',
    description: 'Create blueprints for the lunar module',
    projectId: project.id,
  })).body;
  log('Created task1', task1);
  assert(task1.status === 'todo', 'New task starts as "todo"');

  const task2 = (await request<any>('POST', '/tasks', {
    title: 'Write mission report',
    description: 'Document all mission phases',
    projectId: project.id,
  })).body;
  log('Created task2', task2);

  // List tasks filtered by project
  const projectTasks = (await request<any[]>('GET', `/tasks?projectId=${project.id}`)).body;
  assert(projectTasks.length === 2, `GET /tasks?projectId returns 2 tasks (got ${projectTasks.length})`);

  // Update task
  const updatedTask = (await request<any>('PUT', `/tasks/${task1.id}`, {
    title: 'Design lunar landing module',
  })).body;
  assert(updatedTask.title === 'Design lunar landing module', 'PUT /tasks/:id updates title');

  // ── 4. Task Assignment & Notifications ────────────────────────────────────
  header('4. Task Assignment → Notification');

  // Assign task1 to Alice → should produce a notification for Alice
  const assigned = (await request<any>('PUT', `/tasks/${task1.id}/assign`, { assigneeId: alice.id })).body;
  log('Assigned task1 to Alice', assigned);
  assert(assigned.assigneeId === alice.id, 'Task assigneeId matches Alice');

  const aliceNotifs = (await request<any[]>('GET', `/notifications?userId=${alice.id}`)).body;
  log(`Notifications for Alice (${aliceNotifs.length})`, aliceNotifs);
  assert(aliceNotifs.length >= 1, 'Alice received at least 1 notification after assignment');
  assert(
    aliceNotifs.some((n: any) => n.message.includes('assigned')),
    'Alice notification mentions assignment'
  );

  // ── 5. Status Transitions ─────────────────────────────────────────────────
  header('5. Status Transitions');

  const toInProgress = (await request<any>('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' })).body;
  assert(toInProgress.status === 'in-progress', 'task1 moved to in-progress');

  const toDone = (await request<any>('PUT', `/tasks/${task1.id}/status`, { status: 'done' })).body;
  assert(toDone.status === 'done', 'task1 moved to done');

  // Invalid transition (backwards)
  const badTransition = await request<any>('PUT', `/tasks/${task1.id}/status`, { status: 'todo' });
  assert(badTransition.status === 400, 'Backwards transition rejected (400)');
  log('Backward transition rejected', badTransition.body);

  // Also validate status-change notifications for Alice
  const aliceNotifsAfterStatus = (await request<any[]>('GET', `/notifications?userId=${alice.id}`)).body;
  const statusNotifs = aliceNotifsAfterStatus.filter((n: any) => n.message.includes('status changed'));
  assert(statusNotifs.length >= 1, `Alice got ${statusNotifs.length} status-change notification(s)`);

  // ── 6. Comments ───────────────────────────────────────────────────────────
  header('6. Comments & Notifications');

  // task2 is unassigned; assign to Alice first so we can test comment notifications
  await request<any>('PUT', `/tasks/${task2.id}/assign`, { assigneeId: alice.id });

  // Bob adds a comment on task2 (Alice is the assignee)
  const comment1 = (await request<any>('POST', '/comments', {
    taskId: task2.id,
    authorId: bob.id,
    body: 'I have finished the first draft of the report.',
  })).body;
  log('Bob comments on task2', comment1);
  assert(comment1.id !== undefined, 'Comment has an ID');
  assert(comment1.authorId === bob.id, 'Comment authorId is Bob');

  // Alice (assignee) should receive a notification about Bob's comment
  const aliceNotifsAfterComment = (await request<any[]>('GET', `/notifications?userId=${alice.id}`)).body;
  const commentNotifs = aliceNotifsAfterComment.filter((n: any) => n.message.includes('comment'));
  log(`Alice's comment notifications`, commentNotifs);
  assert(commentNotifs.length >= 1, 'Alice got at least 1 comment notification');

  // Alice adds her own comment on task2 — no self-notification should be created
  const countBefore = aliceNotifsAfterComment.length;
  const comment2 = (await request<any>('POST', '/comments', {
    taskId: task2.id,
    authorId: alice.id,
    body: 'Thanks Bob, I will review it.',
  })).body;
  log('Alice comments on task2 (no self-notification expected)', comment2);

  const aliceNotifsAfterSelf = (await request<any[]>('GET', `/notifications?userId=${alice.id}`)).body;
  assert(
    aliceNotifsAfterSelf.length === countBefore,
    `No new notification for Alice when she comments on her own task (${countBefore} → ${aliceNotifsAfterSelf.length})`
  );

  // List comments by task
  const taskComments = (await request<any[]>('GET', `/comments?taskId=${task2.id}`)).body;
  assert(taskComments.length === 2, `GET /comments?taskId returns 2 comments (got ${taskComments.length})`);

  // Get a single comment
  const singleComment = (await request<any>('GET', `/comments/${comment1.id}`)).body;
  assert(singleComment.id === comment1.id, 'GET /comments/:id returns correct comment');

  // ── 7. Mark Notifications as Read ────────────────────────────────────────
  header('7. Mark Notifications as Read');

  const unread = aliceNotifsAfterSelf.filter((n: any) => !n.read);
  assert(unread.length > 0, `Alice has ${unread.length} unread notification(s)`);

  const markedRead = (await request<any>('PUT', `/notifications/${unread[0].id}/read`)).body;
  assert(markedRead.read === true, 'Notification marked as read');
  log('Marked notification as read', markedRead);

  // ── 8. Validation / Error Cases ───────────────────────────────────────────
  header('8. Validation & Error Handling');

  // Task belonging to non-existent project
  const badProjectTask = await request<any>('POST', '/tasks', {
    title: 'Ghost task',
    projectId: 'non-existent-project-id',
  });
  assert(badProjectTask.status === 404, 'Creating task for missing project returns 404');

  // GET non-existent user
  const missingUser = await request<any>('GET', '/users/does-not-exist');
  assert(missingUser.status === 404, 'GET /users/:missing returns 404');

  // Comment on non-existent task
  const badComment = await request<any>('POST', '/comments', {
    taskId: 'no-such-task',
    authorId: alice.id,
    body: 'Hello?',
  });
  assert(badComment.status === 404, 'Comment on missing task returns 404');

  // Assign to non-existent user
  const badAssign = await request<any>('PUT', `/tasks/${task2.id}/assign`, {
    assigneeId: 'no-such-user',
  });
  assert(badAssign.status === 404, 'Assign to missing user returns 404');

  // ── 9. DELETE operations ──────────────────────────────────────────────────
  header('9. Delete Operations');

  const delComment = await request<any>('DELETE', `/comments/${comment2.id}`);
  assert(delComment.status === 200, 'DELETE /comments/:id succeeds');

  const remainingComments = (await request<any[]>('GET', `/comments?taskId=${task2.id}`)).body;
  assert(remainingComments.length === 1, 'Only 1 comment remains after delete');

  const delTask = await request<any>('DELETE', `/tasks/${task1.id}`);
  assert(delTask.status === 200, 'DELETE /tasks/:id succeeds');

  const remainingTasks = (await request<any[]>('GET', `/tasks?projectId=${project.id}`)).body;
  assert(remainingTasks.length === 1, 'Only 1 task remains after delete');

  const delProject = await request<any>('DELETE', `/projects/${project.id}`);
  assert(delProject.status === 200, 'DELETE /projects/:id succeeds');

  const projects = (await request<any[]>('GET', '/projects')).body;
  assert(projects.length === 0, 'No projects remain');

  const delUser = await request<any>('DELETE', `/users/${carol.id}`);
  assert(delUser.status === 200, 'DELETE /users/:id succeeds');

  const finalUsers = (await request<any[]>('GET', '/users')).body;
  assert(finalUsers.length === 2, `2 users remain after deleting Carol (got ${finalUsers.length})`);

  // ── Summary ───────────────────────────────────────────────────────────────
  header('Demo Complete ✔');
  console.log('All features exercised successfully.\n');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

server.listen(PORT, async () => {
  console.log(`${BOLD}Task Management API — Demo${RESET}`);
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await runDemo();
  } catch (err) {
    console.error('Demo failed with unexpected error:', err);
  } finally {
    server.close(() => {
      console.log('Demo server shut down.');
      process.exit(0);
    });
  }
});
