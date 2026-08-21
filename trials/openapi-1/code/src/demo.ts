// ============================================================
// Demo Script
// Starts the server, exercises every endpoint, and prints
// a pass/fail summary. Run with: npx tsx src/demo.ts
// ============================================================

import { createServer, request as httpRequest, IncomingMessage } from 'http';
import { handleRequest } from './router.js';

const PORT = 3001; // separate port so it doesn't clash with main.ts
const BASE = `http://localhost:${PORT}`;

// ---- Minimal HTTP client ------------------------------------

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

async function apiRequest<T = unknown>(
  method: string,
  path: string,
  payload?: unknown,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const bodyStr = payload !== undefined ? JSON.stringify(payload) : undefined;

    const options = {
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr
          ? { 'Content-Length': String(Buffer.byteLength(bodyStr)) }
          : {}),
      },
    };

    const req = httpRequest(options, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
        resolve({ status: res.statusCode ?? 0, body: body as T });
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---- Test harness -------------------------------------------

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`, detail !== undefined ? detail : '');
    failed++;
  }
}

// ---- Demo flow ----------------------------------------------

async function runDemo(): Promise<void> {
  console.log('\n🚀 Task Management API — Demo\n');

  // ── 1. Create Users ────────────────────────────────────────
  console.log('── 1. Create Users ──────────────────────────────────');

  const alice = await apiRequest<Record<string, string>>('POST', '/users', {
    name: 'Alice',
    email: 'alice@example.com',
  });
  assert('Create Alice → 201', alice.status === 201);
  assert(
    'Alice has id',
    typeof (alice.body as Record<string, string>).id === 'string',
  );
  const aliceId = (alice.body as Record<string, string>).id;

  const bob = await apiRequest<Record<string, string>>('POST', '/users', {
    name: 'Bob',
    email: 'bob@example.com',
  });
  assert('Create Bob → 201', bob.status === 201);
  const bobId = (bob.body as Record<string, string>).id;

  const carol = await apiRequest<Record<string, string>>('POST', '/users', {
    name: 'Carol',
    email: 'carol@example.com',
  });
  assert('Create Carol → 201', carol.status === 201);
  const carolId = (carol.body as Record<string, string>).id;

  // List users
  const users = await apiRequest<unknown[]>('GET', '/users');
  assert('List users → 200', users.status === 200);
  assert('3 users returned', (users.body as unknown[]).length === 3);

  // Get user by id
  const getAlice = await apiRequest<Record<string, string>>(
    'GET',
    `/users/${aliceId}`,
  );
  assert('Get Alice by id → 200', getAlice.status === 200);
  assert(
    'Alice name matches',
    (getAlice.body as Record<string, string>).name === 'Alice',
  );

  // Update user
  const updateAlice = await apiRequest<Record<string, string>>(
    'PUT',
    `/users/${aliceId}`,
    { name: 'Alice A.' },
  );
  assert('Update Alice → 200', updateAlice.status === 200);
  assert(
    'Alice name updated',
    (updateAlice.body as Record<string, string>).name === 'Alice A.',
  );

  // 404 on unknown user
  const notFound = await apiRequest('GET', '/users/no-such-id');
  assert('GET unknown user → 404', notFound.status === 404);

  // ── 2. Create Project ──────────────────────────────────────
  console.log('\n── 2. Create Project ────────────────────────────────');

  const proj = await apiRequest<Record<string, unknown>>('POST', '/projects', {
    name: 'Phoenix',
    description: 'Project Phoenix relaunch',
  });
  assert('Create project → 201', proj.status === 201);
  const projectId = (proj.body as Record<string, string>).id;

  const listProj = await apiRequest<unknown[]>('GET', '/projects');
  assert('List projects → 200', listProj.status === 200);
  assert('1 project returned', (listProj.body as unknown[]).length === 1);

  // Get project
  const getProj = await apiRequest<Record<string, unknown>>(
    'GET',
    `/projects/${projectId}`,
  );
  assert('Get project → 200', getProj.status === 200);

  // Update project
  const updateProj = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/projects/${projectId}`,
    { description: 'Updated description' },
  );
  assert('Update project → 200', updateProj.status === 200);
  assert(
    'Description updated',
    (updateProj.body as Record<string, string>).description ===
      'Updated description',
  );

  // ── 3. Add Members ────────────────────────────────────────
  console.log('\n── 3. Add Members ───────────────────────────────────');

  const addAlice = await apiRequest<Record<string, unknown>>(
    'POST',
    `/projects/${projectId}/members`,
    { userId: aliceId },
  );
  assert('Add Alice to project → 200', addAlice.status === 200);

  const addBob = await apiRequest<Record<string, unknown>>(
    'POST',
    `/projects/${projectId}/members`,
    { userId: bobId },
  );
  assert('Add Bob to project → 200', addBob.status === 200);
  assert(
    'Project has 2 members',
    ((addBob.body as Record<string, unknown>).memberIds as string[]).length ===
      2,
  );

  // Remove a member
  const removeBob = await apiRequest<Record<string, unknown>>(
    'DELETE',
    `/projects/${projectId}/members`,
    { userId: bobId },
  );
  assert('Remove Bob from project → 200', removeBob.status === 200);
  assert(
    'Project has 1 member',
    (
      (removeBob.body as Record<string, unknown>).memberIds as string[]
    ).length === 1,
  );

  // Re-add Bob so he's a member for later steps
  await apiRequest('POST', `/projects/${projectId}/members`, {
    userId: bobId,
  });

  // ── 4. Create Tasks ───────────────────────────────────────
  console.log('\n── 4. Create Tasks ──────────────────────────────────');

  const task1 = await apiRequest<Record<string, unknown>>('POST', '/tasks', {
    title: 'Design wireframes',
    description: 'Create initial UI mockups',
    projectId,
  });
  assert('Create task 1 → 201', task1.status === 201);
  assert(
    "Task 1 status is 'todo'",
    (task1.body as Record<string, string>).status === 'todo',
  );
  const task1Id = (task1.body as Record<string, string>).id;

  const task2 = await apiRequest<Record<string, unknown>>('POST', '/tasks', {
    title: 'Implement API',
    description: 'Build the REST API layer',
    projectId,
  });
  assert('Create task 2 → 201', task2.status === 201);
  const task2Id = (task2.body as Record<string, string>).id;

  // List tasks by project
  const taskList = await apiRequest<unknown[]>(
    'GET',
    `/tasks?projectId=${projectId}`,
  );
  assert('List tasks by project → 200', taskList.status === 200);
  assert('2 tasks returned', (taskList.body as unknown[]).length === 2);

  // Get task by id
  const getTask = await apiRequest<Record<string, unknown>>(
    'GET',
    `/tasks/${task1Id}`,
  );
  assert('Get task → 200', getTask.status === 200);

  // Update task fields
  const updateTask = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/tasks/${task1Id}`,
    { title: 'Design wireframes v2' },
  );
  assert('Update task → 200', updateTask.status === 200);
  assert(
    'Task title updated',
    (updateTask.body as Record<string, string>).title ===
      'Design wireframes v2',
  );

  // ── 5. Assign Tasks ───────────────────────────────────────
  console.log('\n── 5. Assign Tasks ──────────────────────────────────');

  const assignTask1 = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/tasks/${task1Id}/assign`,
    { assigneeId: aliceId },
  );
  assert('Assign task 1 to Alice → 200', assignTask1.status === 200);
  assert(
    'Task 1 assigneeId is Alice',
    (assignTask1.body as Record<string, string>).assigneeId === aliceId,
  );

  const assignTask2 = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/tasks/${task2Id}/assign`,
    { assigneeId: bobId },
  );
  assert('Assign task 2 to Bob → 200', assignTask2.status === 200);

  // ── 6. Change Task Status (forward-only) ──────────────────
  console.log('\n── 6. Change Task Status ────────────────────────────');

  // todo → in-progress
  const toInProgress = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/tasks/${task1Id}/status`,
    { status: 'in-progress' },
  );
  assert('Task 1: todo → in-progress → 200', toInProgress.status === 200);
  assert(
    "Status is 'in-progress'",
    (toInProgress.body as Record<string, string>).status === 'in-progress',
  );

  // in-progress → done
  const toDone = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/tasks/${task1Id}/status`,
    { status: 'done' },
  );
  assert('Task 1: in-progress → done → 200', toDone.status === 200);

  // Invalid backward transition: done → todo
  const badTransition = await apiRequest(
    'PUT',
    `/tasks/${task1Id}/status`,
    { status: 'todo' },
  );
  assert('Invalid backward transition (done→todo) → 400', badTransition.status === 400);

  // Invalid skip: todo → done (skipping in-progress)
  const skipTransition = await apiRequest(
    'PUT',
    `/tasks/${task2Id}/status`,
    { status: 'done' },
  );
  assert('Skip transition (todo→done) → 400', skipTransition.status === 400);

  // Valid transition for task 2
  const task2InProgress = await apiRequest(
    'PUT',
    `/tasks/${task2Id}/status`,
    { status: 'in-progress' },
  );
  assert('Task 2: todo → in-progress → 200', task2InProgress.status === 200);

  // ── 7. Add Comments ───────────────────────────────────────
  console.log('\n── 7. Add Comments ──────────────────────────────────');

  const comment1 = await apiRequest<Record<string, unknown>>(
    'POST',
    '/comments',
    {
      taskId: task1Id,
      authorId: carolId,
      body: 'Great work on the wireframes!',
    },
  );
  assert('Create comment by Carol → 201', comment1.status === 201);
  assert(
    'Comment has createdAt',
    typeof (comment1.body as Record<string, string>).createdAt === 'string',
  );
  const comment1Id = (comment1.body as Record<string, string>).id;

  const comment2 = await apiRequest<Record<string, unknown>>(
    'POST',
    '/comments',
    {
      taskId: task1Id,
      authorId: aliceId,
      body: 'Thanks! Updating to v2 now.',
    },
  );
  assert('Create comment by Alice → 201', comment2.status === 201);
  const comment2Id = (comment2.body as Record<string, string>).id;

  // List comments by task
  const commentList = await apiRequest<unknown[]>(
    'GET',
    `/comments?taskId=${task1Id}`,
  );
  assert('List comments by task → 200', commentList.status === 200);
  assert('2 comments returned', (commentList.body as unknown[]).length === 2);

  // Get comment by id
  const getComment = await apiRequest<Record<string, unknown>>(
    'GET',
    `/comments/${comment1Id}`,
  );
  assert('Get comment → 200', getComment.status === 200);

  // Delete a comment
  const deleteComment = await apiRequest('DELETE', `/comments/${comment2Id}`);
  assert('Delete comment → 204', deleteComment.status === 204);

  const afterDelete = await apiRequest<unknown[]>(
    'GET',
    `/comments?taskId=${task1Id}`,
  );
  assert('1 comment remaining after delete', (afterDelete.body as unknown[]).length === 1);

  // ── 8. Check Notifications ────────────────────────────────
  console.log('\n── 8. Check Notifications ───────────────────────────');

  // Alice should have notifications for:
  //   - assigned to task 1
  //   - task 1 status → in-progress
  //   - task 1 status → done
  //   - Alice's own comment recorded
  const aliceNotifs = await apiRequest<Record<string, unknown>[]>(
    'GET',
    `/notifications?userId=${aliceId}`,
  );
  assert('Get Alice notifications → 200', aliceNotifs.status === 200);
  const aliceNotifCount = (aliceNotifs.body as unknown[]).length;
  assert(
    `Alice has ≥ 3 notifications (got ${aliceNotifCount})`,
    aliceNotifCount >= 3,
  );

  // Bob: assigned to task 2, status changed for task 2
  const bobNotifs = await apiRequest<Record<string, unknown>[]>(
    'GET',
    `/notifications?userId=${bobId}`,
  );
  assert('Get Bob notifications → 200', bobNotifs.status === 200);
  const bobNotifCount = (bobNotifs.body as unknown[]).length;
  assert(
    `Bob has ≥ 2 notifications (got ${bobNotifCount})`,
    bobNotifCount >= 2,
  );

  // Carol commented → gets a notification
  const carolNotifs = await apiRequest<Record<string, unknown>[]>(
    'GET',
    `/notifications?userId=${carolId}`,
  );
  assert('Get Carol notifications → 200', carolNotifs.status === 200);
  assert(
    'Carol has ≥ 1 notification',
    (carolNotifs.body as unknown[]).length >= 1,
  );

  // Mark a notification as read
  const firstAliceNotif = (
    aliceNotifs.body as Record<string, unknown>[]
  )[0];
  const markRead = await apiRequest<Record<string, unknown>>(
    'PUT',
    `/notifications/${firstAliceNotif.id}/read`,
  );
  assert('Mark notification as read → 200', markRead.status === 200);
  assert(
    'Notification.read is true',
    (markRead.body as Record<string, boolean>).read === true,
  );

  // 404 on unknown notification
  const badNotif = await apiRequest('PUT', '/notifications/no-such-id/read');
  assert('Mark unknown notification → 404', badNotif.status === 404);

  // ── 9. Edge Cases & Cleanup ───────────────────────────────
  console.log('\n── 9. Edge Cases & Cleanup ──────────────────────────');

  // Delete a task
  const task3 = await apiRequest<Record<string, string>>('POST', '/tasks', {
    title: 'Temp task',
    description: 'Will be deleted',
    projectId,
  });
  const task3Id = task3.body.id;
  const deleteTask = await apiRequest('DELETE', `/tasks/${task3Id}`);
  assert('Delete task → 204', deleteTask.status === 204);
  const deletedTask = await apiRequest('GET', `/tasks/${task3Id}`);
  assert('Deleted task returns 404', deletedTask.status === 404);

  // Delete a project
  const tempProj = await apiRequest<Record<string, string>>('POST', '/projects', {
    name: 'Temp',
    description: 'Temp',
  });
  const tempProjId = tempProj.body.id;
  const deleteProj = await apiRequest('DELETE', `/projects/${tempProjId}`);
  assert('Delete project → 204', deleteProj.status === 204);
  assert(
    'Deleted project returns 404',
    (await apiRequest('GET', `/projects/${tempProjId}`)).status === 404,
  );

  // Delete a user
  const tempUser = await apiRequest<Record<string, string>>('POST', '/users', {
    name: 'Temp',
    email: 'temp@x.com',
  });
  const tempUserId = tempUser.body.id;
  const deleteUser = await apiRequest('DELETE', `/users/${tempUserId}`);
  assert('Delete user → 204', deleteUser.status === 204);
  assert(
    'Deleted user returns 404',
    (await apiRequest('GET', `/users/${tempUserId}`)).status === 404,
  );

  // Unknown route
  const unknown = await apiRequest('GET', '/foobar');
  assert('Unknown route → 404', unknown.status === 404);

  // Missing required field on create user
  const badUser = await apiRequest('POST', '/users', {
    email: 'no-name@x.com',
  });
  assert('Missing "name" → 400', badUser.status === 400);

  // Missing required field on create task
  const badTask = await apiRequest('POST', '/tasks', {
    description: 'No title here',
    projectId,
  });
  assert('Missing "title" → 400', badTask.status === 400);

  // Invalid status value
  const badStatus = await apiRequest('PUT', `/tasks/${task2Id}/status`, {
    status: 'flying',
  });
  assert('Invalid status value → 400', badStatus.status === 400);

  // ── Summary ───────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed — see ❌ lines above.\n');
  }
}

// ---- Bootstrap ----------------------------------------------

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err: unknown) => {
    console.error('[Demo Server] Error:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(PORT, async () => {
  try {
    await runDemo();
  } catch (err) {
    console.error('Demo failed with uncaught error:', err);
  } finally {
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
});
