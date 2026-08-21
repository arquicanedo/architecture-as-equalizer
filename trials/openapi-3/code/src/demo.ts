/**
 * Demo script — exercises every API endpoint end-to-end.
 *
 * Run with:  npx tsx src/demo.ts
 *
 * The script:
 *  1. Starts the HTTP server on a random available port
 *  2. Runs a full scenario: users → project → members → tasks → assign →
 *     status transitions → comments → notifications → mark-read
 *  3. Prints a pass/fail summary for each step
 *  4. Shuts the server down and exits
 */

import * as http from 'http';
import { URL } from 'url';
import { handleRequest } from './router.js';

// ─── Mini HTTP Client ─────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function apiRequest<T = unknown>(
  method: string,
  url: string,
  payload?: unknown,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = payload !== undefined ? JSON.stringify(payload) : undefined;

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: Number(parsed.port),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr !== undefined
          ? { 'Content-Length': String(Buffer.byteLength(bodyStr)) }
          : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let body: T;
        try {
          body = JSON.parse(raw) as T;
        } catch {
          body = raw as unknown as T;
        }
        resolve({ status: res.statusCode ?? 0, body });
      });
    });

    req.on('error', reject);
    if (bodyStr !== undefined) req.write(bodyStr);
    req.end();
  });
}

// ─── Test Harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(
      `  ❌  ${label}`,
      detail !== undefined ? `→ ${JSON.stringify(detail)}` : '',
    );
    failed++;
  }
}

// ─── Main Demo ────────────────────────────────────────────────────────────────

async function runDemo(baseUrl: string): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Task Management API — End-to-End Demo');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Users ────────────────────────────────────────────────────────────────
  console.log('── 1. Users ──────────────────────────────────────────');

  const aliceRes = await apiRequest<{ id: string; name: string; email: string }>(
    'POST',
    `${baseUrl}/users`,
    { name: 'Alice', email: 'alice@example.com' },
  );
  assert('Create Alice (201)', aliceRes.status === 201);
  assert('Alice has id', typeof aliceRes.body.id === 'string');
  const aliceId = aliceRes.body.id;

  const bobRes = await apiRequest<{ id: string; name: string; email: string }>(
    'POST',
    `${baseUrl}/users`,
    { name: 'Bob', email: 'bob@example.com' },
  );
  assert('Create Bob (201)', bobRes.status === 201);
  const bobId = bobRes.body.id;

  const listUsersRes = await apiRequest<unknown[]>('GET', `${baseUrl}/users`);
  assert(
    'List users returns 2',
    listUsersRes.status === 200 && listUsersRes.body.length === 2,
  );

  const getUserRes = await apiRequest('GET', `${baseUrl}/users/${aliceId}`);
  assert('Get Alice by ID (200)', getUserRes.status === 200);

  const updateUserRes = await apiRequest<{ name: string }>(
    'PUT',
    `${baseUrl}/users/${aliceId}`,
    { name: 'Alice A.' },
  );
  assert('Update Alice name (200)', updateUserRes.status === 200);
  assert('Alice name updated', updateUserRes.body.name === 'Alice A.');

  const missing404 = await apiRequest('GET', `${baseUrl}/users/does-not-exist`);
  assert('Get non-existent user (404)', missing404.status === 404);

  const badUserCreate = await apiRequest('POST', `${baseUrl}/users`, { name: 'NoEmail' });
  assert('Create user without email (400)', badUserCreate.status === 400);

  // ── 2. Projects ─────────────────────────────────────────────────────────────
  console.log('\n── 2. Projects ───────────────────────────────────────');

  const projRes = await apiRequest<{
    id: string;
    name: string;
    memberIds: string[];
  }>('POST', `${baseUrl}/projects`, {
    name: 'Alpha',
    description: 'First project',
  });
  assert('Create project (201)', projRes.status === 201);
  assert('Project memberIds starts empty', projRes.body.memberIds.length === 0);
  const projectId = projRes.body.id;

  const listProjRes = await apiRequest<unknown[]>('GET', `${baseUrl}/projects`);
  assert(
    'List projects (200, 1 project)',
    listProjRes.status === 200 && listProjRes.body.length === 1,
  );

  const getProjRes = await apiRequest('GET', `${baseUrl}/projects/${projectId}`);
  assert('Get project by ID (200)', getProjRes.status === 200);

  const updateProjRes = await apiRequest<{ name: string }>(
    'PUT',
    `${baseUrl}/projects/${projectId}`,
    { name: 'Alpha v2' },
  );
  assert('Update project (200)', updateProjRes.status === 200);
  assert('Project name updated', updateProjRes.body.name === 'Alpha v2');

  const badProjCreate = await apiRequest('POST', `${baseUrl}/projects`, {
    name: 'NoDesc',
  });
  assert('Create project without description (400)', badProjCreate.status === 400);

  // ── 3. Project Members ──────────────────────────────────────────────────────
  console.log('\n── 3. Project Members ────────────────────────────────');

  const addAliceRes = await apiRequest<{ memberIds: string[] }>(
    'POST',
    `${baseUrl}/projects/${projectId}/members`,
    { userId: aliceId },
  );
  assert('Add Alice to project (200)', addAliceRes.status === 200);
  assert('Alice in memberIds', addAliceRes.body.memberIds.includes(aliceId));

  const addBobRes = await apiRequest<{ memberIds: string[] }>(
    'POST',
    `${baseUrl}/projects/${projectId}/members`,
    { userId: bobId },
  );
  assert('Add Bob to project (200)', addBobRes.status === 200);
  assert('Both members present', addBobRes.body.memberIds.length === 2);

  // Idempotent add
  const addAliceAgain = await apiRequest<{ memberIds: string[] }>(
    'POST',
    `${baseUrl}/projects/${projectId}/members`,
    { userId: aliceId },
  );
  assert(
    'Add Alice again is idempotent (still 2 members)',
    addAliceAgain.body.memberIds.length === 2,
  );

  const removeBobRes = await apiRequest<{ memberIds: string[] }>(
    'DELETE',
    `${baseUrl}/projects/${projectId}/members`,
    { userId: bobId },
  );
  assert('Remove Bob from project (200)', removeBobRes.status === 200);
  assert('Only Alice remains', removeBobRes.body.memberIds.length === 1);

  // Re-add Bob for rest of demo
  await apiRequest('POST', `${baseUrl}/projects/${projectId}/members`, {
    userId: bobId,
  });

  // ── 4. Tasks ─────────────────────────────────────────────────────────────────
  console.log('\n── 4. Tasks ──────────────────────────────────────────');

  const task1Res = await apiRequest<{
    id: string;
    status: string;
    assigneeId: null;
  }>('POST', `${baseUrl}/tasks`, {
    title: 'Design schema',
    description: 'Draft the DB schema',
    projectId,
  });
  assert('Create task 1 (201)', task1Res.status === 201);
  assert('Task status starts as todo', task1Res.body.status === 'todo');
  assert('Task assigneeId starts null', task1Res.body.assigneeId === null);
  const task1Id = task1Res.body.id;

  const task2Res = await apiRequest<{ id: string }>(
    'POST',
    `${baseUrl}/tasks`,
    { title: 'Write tests', description: 'Unit + integration tests', projectId },
  );
  assert('Create task 2 (201)', task2Res.status === 201);
  const task2Id = task2Res.body.id;

  const listTasksRes = await apiRequest<unknown[]>(
    'GET',
    `${baseUrl}/tasks?projectId=${projectId}`,
  );
  assert(
    'List tasks by project (200, 2 tasks)',
    listTasksRes.status === 200 && listTasksRes.body.length === 2,
  );

  const getTaskRes = await apiRequest('GET', `${baseUrl}/tasks/${task1Id}`);
  assert('Get task by ID (200)', getTaskRes.status === 200);

  const updateTaskRes = await apiRequest<{ title: string }>(
    'PUT',
    `${baseUrl}/tasks/${task1Id}`,
    { title: 'Design schema v2' },
  );
  assert('Update task title (200)', updateTaskRes.status === 200);
  assert('Task title updated', updateTaskRes.body.title === 'Design schema v2');

  const emptyTasksRes = await apiRequest<unknown[]>(
    'GET',
    `${baseUrl}/tasks?projectId=none`,
  );
  assert(
    'List tasks for unknown project returns empty array',
    emptyTasksRes.status === 200 && emptyTasksRes.body.length === 0,
  );

  const missingTaskId = await apiRequest('GET', `${baseUrl}/tasks/no-such-id`);
  assert('Get non-existent task (404)', missingTaskId.status === 404);

  // ── 5. Assign Tasks ──────────────────────────────────────────────────────────
  console.log('\n── 5. Assign Tasks ───────────────────────────────────');

  const assignRes = await apiRequest<{ assigneeId: string }>(
    'PUT',
    `${baseUrl}/tasks/${task1Id}/assign`,
    { assigneeId: aliceId },
  );
  assert('Assign task 1 to Alice (200)', assignRes.status === 200);
  assert('Task assigneeId is Alice', assignRes.body.assigneeId === aliceId);

  const assign2Res = await apiRequest<{ assigneeId: string }>(
    'PUT',
    `${baseUrl}/tasks/${task2Id}/assign`,
    { assigneeId: bobId },
  );
  assert('Assign task 2 to Bob (200)', assign2Res.status === 200);
  assert('Task 2 assigneeId is Bob', assign2Res.body.assigneeId === bobId);

  // ── 6. Status Transitions ────────────────────────────────────────────────────
  console.log('\n── 6. Status Transitions ─────────────────────────────');

  // Valid: todo → in-progress
  const s1 = await apiRequest<{ status: string }>(
    'PUT',
    `${baseUrl}/tasks/${task1Id}/status`,
    { status: 'in-progress' },
  );
  assert('Transition task1 todo→in-progress (200)', s1.status === 200);
  assert('Status is in-progress', s1.body.status === 'in-progress');

  // Invalid: in-progress → todo (backward)
  const s2 = await apiRequest(
    'PUT',
    `${baseUrl}/tasks/${task1Id}/status`,
    { status: 'todo' },
  );
  assert('Backward transition in-progress→todo rejected (400)', s2.status === 400);

  // Invalid: skip — todo → done (skipping in-progress)
  const s3 = await apiRequest(
    'PUT',
    `${baseUrl}/tasks/${task2Id}/status`,
    { status: 'done' },
  );
  assert('Skip transition todo→done rejected (400)', s3.status === 400);

  // Valid: in-progress → done
  const s4 = await apiRequest<{ status: string }>(
    'PUT',
    `${baseUrl}/tasks/${task1Id}/status`,
    { status: 'done' },
  );
  assert('Transition task1 in-progress→done (200)', s4.status === 200);
  assert('Status is done', s4.body.status === 'done');

  // Invalid: done → anything
  const s5 = await apiRequest(
    'PUT',
    `${baseUrl}/tasks/${task1Id}/status`,
    { status: 'in-progress' },
  );
  assert('Transition from done rejected (400)', s5.status === 400);

  // Invalid status value
  const s6 = await apiRequest(
    'PUT',
    `${baseUrl}/tasks/${task2Id}/status`,
    { status: 'invalid-status' },
  );
  assert('Invalid status value rejected (400)', s6.status === 400);

  // ── 7. Comments ──────────────────────────────────────────────────────────────
  console.log('\n── 7. Comments ───────────────────────────────────────');

  const c1Res = await apiRequest<{
    id: string;
    body: string;
    createdAt: string;
  }>('POST', `${baseUrl}/comments`, {
    taskId: task2Id,
    authorId: aliceId,
    body: 'Working on this!',
  });
  assert('Create comment (201)', c1Res.status === 201);
  assert('Comment has createdAt', typeof c1Res.body.createdAt === 'string');
  const comment1Id = c1Res.body.id;

  const c2Res = await apiRequest<{ id: string }>(
    'POST',
    `${baseUrl}/comments`,
    { taskId: task2Id, authorId: bobId, body: 'I can help with this.' },
  );
  assert('Create second comment (201)', c2Res.status === 201);

  const listCommentsRes = await apiRequest<unknown[]>(
    'GET',
    `${baseUrl}/comments?taskId=${task2Id}`,
  );
  assert(
    'List comments by task (200, 2 comments)',
    listCommentsRes.status === 200 && listCommentsRes.body.length === 2,
  );

  const getCommentRes = await apiRequest('GET', `${baseUrl}/comments/${comment1Id}`);
  assert('Get comment by ID (200)', getCommentRes.status === 200);

  // Comment referencing non-existent task
  const badComment = await apiRequest('POST', `${baseUrl}/comments`, {
    taskId: 'no-such-task',
    authorId: aliceId,
    body: 'Ghost comment',
  });
  assert('Comment on non-existent task (404)', badComment.status === 404);

  // Comment referencing non-existent author
  const badAuthor = await apiRequest('POST', `${baseUrl}/comments`, {
    taskId: task2Id,
    authorId: 'no-such-user',
    body: 'Ghost author comment',
  });
  assert('Comment with non-existent author (404)', badAuthor.status === 404);

  // ── 8. Notifications ─────────────────────────────────────────────────────────
  console.log('\n── 8. Notifications ──────────────────────────────────');
  //
  // Events fired during this demo:
  //   task.assigned       → task1 assigned to Alice  → 1 notif for Alice
  //   task.assigned       → task2 assigned to Bob    → 1 notif for Bob
  //   task.statusChanged  → task1 todo→in-progress, assignee=Alice → 1 notif Alice
  //   task.statusChanged  → task1 in-progress→done,  assignee=Alice → 1 notif Alice
  //   comment.added       → Alice commented on task2 → 1 notif Alice
  //   comment.added       → Bob commented on task2   → 1 notif Bob
  //
  // Alice: 4 notifications, Bob: 2 notifications

  const aliceNotifRes = await apiRequest<
    Array<{ id: string; message: string; read: boolean }>
  >('GET', `${baseUrl}/notifications?userId=${aliceId}`);
  assert('List Alice notifications (200)', aliceNotifRes.status === 200);
  assert(
    'Alice has 4 notifications',
    aliceNotifRes.body.length === 4,
    aliceNotifRes.body.map((n) => n.message),
  );

  const bobNotifRes = await apiRequest<
    Array<{ id: string; message: string; read: boolean }>
  >('GET', `${baseUrl}/notifications?userId=${bobId}`);
  assert('List Bob notifications (200)', bobNotifRes.status === 200);
  assert(
    'Bob has 2 notifications',
    bobNotifRes.body.length === 2,
    bobNotifRes.body.map((n) => n.message),
  );

  // All notifications start unread
  const allUnread = aliceNotifRes.body.every((n) => !n.read);
  assert('All Alice notifications start unread', allUnread);

  // Mark one as read
  const notifId = aliceNotifRes.body[0].id;
  const markReadRes = await apiRequest<{ id: string; read: boolean }>(
    'PUT',
    `${baseUrl}/notifications/${notifId}/read`,
  );
  assert('Mark notification as read (200)', markReadRes.status === 200);
  assert('Notification is now read', markReadRes.body.read === true);

  // Missing notification
  const missingNotif = await apiRequest(
    'PUT',
    `${baseUrl}/notifications/no-such-notif/read`,
  );
  assert('Mark non-existent notification (404)', missingNotif.status === 404);

  // userId required
  const missingUserQ = await apiRequest('GET', `${baseUrl}/notifications`);
  assert('Notifications without userId (400)', missingUserQ.status === 400);

  // ── 9. Deletions ─────────────────────────────────────────────────────────────
  console.log('\n── 9. Deletions ──────────────────────────────────────');

  const delCommentRes = await apiRequest(
    'DELETE',
    `${baseUrl}/comments/${comment1Id}`,
  );
  assert('Delete comment (204)', delCommentRes.status === 204);

  const delCommentAgain = await apiRequest(
    'DELETE',
    `${baseUrl}/comments/${comment1Id}`,
  );
  assert('Delete non-existent comment (404)', delCommentAgain.status === 404);

  const delTaskRes = await apiRequest('DELETE', `${baseUrl}/tasks/${task1Id}`);
  assert('Delete task (204)', delTaskRes.status === 204);

  const delTaskAgain = await apiRequest('DELETE', `${baseUrl}/tasks/${task1Id}`);
  assert('Delete non-existent task (404)', delTaskAgain.status === 404);

  // Throwaway user + project for delete tests
  const tmpUser = await apiRequest<{ id: string }>('POST', `${baseUrl}/users`, {
    name: 'Temp',
    email: 'temp@example.com',
  });
  const tmpProj = await apiRequest<{ id: string }>(
    'POST',
    `${baseUrl}/projects`,
    { name: 'Tmp', description: 'Temporary' },
  );

  const delUserRes = await apiRequest(
    'DELETE',
    `${baseUrl}/users/${tmpUser.body.id}`,
  );
  assert('Delete user (204)', delUserRes.status === 204);

  const delUserAgain = await apiRequest(
    'DELETE',
    `${baseUrl}/users/${tmpUser.body.id}`,
  );
  assert('Delete non-existent user (404)', delUserAgain.status === 404);

  const delProjRes = await apiRequest(
    'DELETE',
    `${baseUrl}/projects/${tmpProj.body.id}`,
  );
  assert('Delete project (204)', delProjRes.status === 204);

  const delProjAgain = await apiRequest(
    'DELETE',
    `${baseUrl}/projects/${tmpProj.body.id}`,
  );
  assert('Delete non-existent project (404)', delProjAgain.status === 404);

  // ── 10. Unknown Routes ───────────────────────────────────────────────────────
  console.log('\n── 10. Unknown Routes ────────────────────────────────');

  const unknown = await apiRequest('GET', `${baseUrl}/no-such-route`);
  assert('Unknown route (404)', unknown.status === 404);

  const unknownMethod = await apiRequest('PATCH', `${baseUrl}/users`);
  assert('Unsupported method on known path (404)', unknownMethod.status === 404);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[Demo server] Unhandled:', err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.listen(0, '127.0.0.1', async () => {
  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    console.error('Could not determine server address');
    process.exit(1);
  }

  const baseUrl = `http://127.0.0.1:${addr.port}`;
  console.log(`Demo server listening on ${baseUrl}`);

  try {
    await runDemo(baseUrl);
  } catch (err) {
    console.error('\n[Demo] Unexpected error:', err);
    failed++;
  } finally {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════\n');
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
});
