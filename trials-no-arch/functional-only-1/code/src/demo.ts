/**
 * demo.ts — End-to-end demonstration of the Task Management API.
 *
 * Starts the HTTP server on a random port, then walks through every
 * feature in order:
 *   1. User CRUD
 *   2. Project CRUD + member management
 *   3. Task CRUD + status transitions + assignment
 *   4. Comments CRUD
 *   5. Notifications (list & mark-as-read)
 *
 * Prints coloured, indented output so the flow is easy to follow.
 */

import { createServer } from './server.js';
import http from 'http';

// ─── Tiny HTTP client ────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  port?: number,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: port ?? 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed: unknown;
        try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
        resolve({ status: res.statusCode ?? 0, body: parsed as T });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Pretty printer ──────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN  = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const DIM   = '\x1b[2m';

function header(title: string) {
  console.log(`\n${BOLD}${CYAN}${'═'.repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${'═'.repeat(60)}${RESET}`);
}

function step(label: string) {
  console.log(`\n${BOLD}${YELLOW}▶ ${label}${RESET}`);
}

function show(label: string, value: unknown) {
  const json = JSON.stringify(value, null, 2)
    .split('\n')
    .map(l => `    ${l}`)
    .join('\n');
  console.log(`  ${DIM}${label}${RESET}\n${GREEN}${json}${RESET}`);
}

function info(msg: string) {
  console.log(`  ${DIM}${msg}${RESET}`);
}

function fail(label: string, expected: number, got: number, body: unknown) {
  console.log(`  ${RED}✗ UNEXPECTED STATUS for "${label}": expected ${expected}, got ${got}${RESET}`);
  console.log(`  ${RED}  Body: ${JSON.stringify(body)}${RESET}`);
  process.exit(1);
}

function assert(label: string, expectedStatus: number, res: ApiResponse) {
  if (res.status !== expectedStatus) {
    fail(label, expectedStatus, res.status, res.body);
  }
  console.log(`  ${GREEN}✓ ${label} → HTTP ${res.status}${RESET}`);
}

// ─── Main demo ───────────────────────────────────────────────────────────────

async function main() {
  // Start server on a random available port
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Could not get port');
  const PORT = addr.port;

  const api = <T = unknown>(method: string, path: string, body?: unknown) =>
    request<T>(method, path, body, PORT);

  console.log(`${BOLD}Task Management API — Demo${RESET}`);
  console.log(`Server listening on port ${PORT}`);

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  header('1. USERS');

  step('Create user Alice');
  const aliceRes = await api('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
  assert('Create Alice', 201, aliceRes);
  const alice = aliceRes.body as { id: string; name: string; email: string };
  show('Alice', alice);

  step('Create user Bob');
  const bobRes = await api('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
  assert('Create Bob', 201, bobRes);
  const bob = bobRes.body as { id: string; name: string; email: string };
  show('Bob', bob);

  step('Create user Carol');
  const carolRes = await api('POST', '/users', { name: 'Carol', email: 'carol@example.com' });
  assert('Create Carol', 201, carolRes);
  const carol = carolRes.body as { id: string; name: string; email: string };
  show('Carol', carol);

  step('Attempt to create duplicate email (should be 409)');
  const dupRes = await api('POST', '/users', { name: 'Alice2', email: 'alice@example.com' });
  assert('Duplicate email → 409', 409, dupRes);

  step('Attempt to create user without name (should be 400)');
  const badUserRes = await api('POST', '/users', { email: 'nobody@example.com' });
  assert('Missing name → 400', 400, badUserRes);

  step('List all users');
  const usersRes = await api('GET', '/users');
  assert('List users', 200, usersRes);
  info(`Total users: ${(usersRes.body as unknown[]).length}`);

  step('Get single user');
  const getSingleRes = await api('GET', `/users/${alice.id}`);
  assert('Get Alice', 200, getSingleRes);

  step('Update user Bob');
  const updateBobRes = await api('PUT', `/users/${bob.id}`, { name: 'Robert' });
  assert('Update Bob name', 200, updateBobRes);
  show('Updated Bob', updateBobRes.body);

  step('Get non-existent user (should be 404)');
  const noUserRes = await api('GET', '/users/no-such-id');
  assert('Non-existent user → 404', 404, noUserRes);

  // ── 2. PROJECTS ───────────────────────────────────────────────────────────
  header('2. PROJECTS');

  step('Create project Alpha');
  const projRes = await api('POST', '/projects', {
    name: 'Project Alpha',
    description: 'Our first project',
  });
  assert('Create project', 201, projRes);
  const project = projRes.body as { id: string; name: string; memberIds: string[] };
  show('Project Alpha', project);

  step('Create project Beta');
  const proj2Res = await api('POST', '/projects', { name: 'Project Beta' });
  assert('Create project Beta', 201, proj2Res);
  const project2 = proj2Res.body as { id: string; name: string };
  show('Project Beta', project2);

  step('List all projects');
  const projsRes = await api('GET', '/projects');
  assert('List projects', 200, projsRes);
  info(`Total projects: ${(projsRes.body as unknown[]).length}`);

  step('Update project Alpha description');
  const updProjRes = await api('PUT', `/projects/${project.id}`, {
    description: 'Our primary initiative',
  });
  assert('Update project', 200, updProjRes);

  step('Add Alice as member of Project Alpha');
  const addAliceRes = await api('POST', `/projects/${project.id}/members`, { userId: alice.id });
  assert('Add Alice to project', 200, addAliceRes);

  step('Add Bob as member of Project Alpha');
  const addBobRes = await api('POST', `/projects/${project.id}/members`, { userId: bob.id });
  assert('Add Bob to project', 200, addBobRes);
  show('Project Alpha members', (addBobRes.body as { memberIds: string[] }).memberIds);

  step('Add Carol as member of Project Alpha');
  const addCarolRes = await api('POST', `/projects/${project.id}/members`, { userId: carol.id });
  assert('Add Carol to project', 200, addCarolRes);

  step('Attempt to add Alice again (should be 409)');
  const dupMemberRes = await api('POST', `/projects/${project.id}/members`, { userId: alice.id });
  assert('Duplicate member → 409', 409, dupMemberRes);

  step('Remove Carol from Project Alpha');
  const removeCarolRes = await api('DELETE', `/projects/${project.id}/members`, { userId: carol.id });
  assert('Remove Carol from project', 200, removeCarolRes);
  show('Project Alpha after Carol removed', removeCarolRes.body);

  step('Get project (verify members)');
  const getProjRes = await api('GET', `/projects/${project.id}`);
  assert('Get project Alpha', 200, getProjRes);

  // ── 3. TASKS ──────────────────────────────────────────────────────────────
  header('3. TASKS');

  step('Create Task 1 (unassigned)');
  const task1Res = await api('POST', '/tasks', {
    title: 'Design database schema',
    description: 'Decide on collections and indexes',
    projectId: project.id,
  });
  assert('Create task 1', 201, task1Res);
  const task1 = task1Res.body as { id: string; title: string; status: string; assigneeId: string | null };
  show('Task 1', task1);

  step('Create Task 2 (assigned to Alice at creation)');
  const task2Res = await api('POST', '/tasks', {
    title: 'Implement REST API',
    description: 'Build all endpoints',
    projectId: project.id,
    assigneeId: alice.id,
  });
  assert('Create task 2', 201, task2Res);
  const task2 = task2Res.body as { id: string; title: string; status: string; assigneeId: string };
  show('Task 2 (assigned to Alice)', task2);

  step('Create Task 3');
  const task3Res = await api('POST', '/tasks', {
    title: 'Write unit tests',
    projectId: project.id,
  });
  assert('Create task 3', 201, task3Res);
  const task3 = task3Res.body as { id: string; title: string; status: string };
  show('Task 3', task3);

  step('List all tasks');
  const tasksRes = await api('GET', '/tasks');
  assert('List tasks', 200, tasksRes);
  info(`Total tasks: ${(tasksRes.body as unknown[]).length}`);

  step(`Filter tasks by projectId=${project.id}`);
  const filteredTasksRes = await api('GET', `/tasks?projectId=${project.id}`);
  assert('Filter tasks by project', 200, filteredTasksRes);
  info(`Tasks in project: ${(filteredTasksRes.body as unknown[]).length}`);

  step('Update task 1 title');
  const updateTask1Res = await api('PUT', `/tasks/${task1.id}`, {
    title: 'Design database schema (revised)',
  });
  assert('Update task 1', 200, updateTask1Res);
  show('Updated Task 1', updateTask1Res.body);

  step('Attempt invalid status transition todo → done (should be 422)');
  const badTransRes = await api('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
  assert('Invalid transition → 422', 422, badTransRes);
  show('Error detail', badTransRes.body);

  step('Valid status transition: todo → in-progress (Task 1)');
  const trans1Res = await api('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  assert('Transition to in-progress', 200, trans1Res);
  show('Task 1 status', { status: (trans1Res.body as { status: string }).status });

  step('Valid status transition: in-progress → done (Task 1)');
  const trans2Res = await api('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
  assert('Transition to done', 200, trans2Res);
  show('Task 1 status', { status: (trans2Res.body as { status: string }).status });

  step('Attempt transition from done → anything (should be 422)');
  const terminalRes = await api('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
  assert('Terminal state → 422', 422, terminalRes);

  step('Assign Task 1 to Bob');
  const assignRes = await api('PUT', `/tasks/${task1.id}/assign`, { assigneeId: bob.id });
  assert('Assign task to Bob', 200, assignRes);
  show('Task 1 assignee', { assigneeId: (assignRes.body as { assigneeId: string }).assigneeId });

  step('Move Task 2: todo → in-progress');
  const task2Trans = await api('PUT', `/tasks/${task2.id}/status`, { status: 'in-progress' });
  assert('Task 2 → in-progress', 200, task2Trans);

  step('Unassign Task 3 (set assigneeId to null)');
  const unassignRes = await api('PUT', `/tasks/${task3.id}/assign`, { assigneeId: null });
  assert('Unassign task 3', 200, unassignRes);
  info(`Task 3 assigneeId: ${(unassignRes.body as { assigneeId: string | null }).assigneeId}`);

  step('Get non-existent task (should be 404)');
  const noTaskRes = await api('GET', '/tasks/no-such-id');
  assert('Non-existent task → 404', 404, noTaskRes);

  // ── 4. COMMENTS ───────────────────────────────────────────────────────────
  header('4. COMMENTS');

  step('Add comment on Task 2 by Alice');
  const comment1Res = await api('POST', '/comments', {
    taskId: task2.id,
    authorId: alice.id,
    body: 'I started working on the API design.',
  });
  assert('Create comment 1', 201, comment1Res);
  const comment1 = comment1Res.body as { id: string; body: string };
  show('Comment 1', comment1);

  step('Add comment on Task 2 by Bob');
  const comment2Res = await api('POST', '/comments', {
    taskId: task2.id,
    authorId: bob.id,
    body: 'Let me know if you need any help!',
  });
  assert('Create comment 2', 201, comment2Res);
  const comment2 = comment2Res.body as { id: string; body: string };
  show('Comment 2', comment2);

  step('Add comment on Task 3 by Alice');
  const comment3Res = await api('POST', '/comments', {
    taskId: task3.id,
    authorId: alice.id,
    body: 'Tests should cover edge cases thoroughly.',
  });
  assert('Create comment 3 (Task 3)', 201, comment3Res);

  step('List all comments');
  const commentsRes = await api('GET', '/comments');
  assert('List all comments', 200, commentsRes);
  info(`Total comments: ${(commentsRes.body as unknown[]).length}`);

  step(`Filter comments by taskId=${task2.id}`);
  const filteredCommRes = await api('GET', `/comments?taskId=${task2.id}`);
  assert('Filter comments by task', 200, filteredCommRes);
  info(`Comments on Task 2: ${(filteredCommRes.body as unknown[]).length}`);

  step('Get single comment');
  const getCommentRes = await api('GET', `/comments/${comment1.id}`);
  assert('Get comment 1', 200, getCommentRes);

  step('Attempt comment with missing authorId (should be 400)');
  const badCommentRes = await api('POST', '/comments', {
    taskId: task2.id,
    body: 'No author here',
  });
  assert('Missing authorId → 400', 400, badCommentRes);

  step('Attempt comment on non-existent task (should be 404)');
  const badTaskComment = await api('POST', '/comments', {
    taskId: 'no-such-task',
    authorId: alice.id,
    body: 'Ghost comment',
  });
  assert('Non-existent task comment → 404', 404, badTaskComment);

  step('Delete comment 2');
  const deleteCommentRes = await api('DELETE', `/comments/${comment2.id}`);
  assert('Delete comment 2', 204, deleteCommentRes);

  step('Verify comment 2 is gone (should be 404)');
  const missingCommentRes = await api('GET', `/comments/${comment2.id}`);
  assert('Deleted comment → 404', 404, missingCommentRes);

  // ── 5. NOTIFICATIONS ──────────────────────────────────────────────────────
  header('5. NOTIFICATIONS');

  step('List all notifications');
  const allNotifsRes = await api('GET', '/notifications');
  assert('List all notifications', 200, allNotifsRes);
  const allNotifs = allNotifsRes.body as Array<{ id: string; userId: string; message: string; read: boolean }>;
  info(`Total notifications: ${allNotifs.length}`);
  show('All notifications', allNotifs);

  step(`List notifications for Alice (userId=${alice.id})`);
  const aliceNotifsRes = await api('GET', `/notifications?userId=${alice.id}`);
  assert('Filter notifications by user', 200, aliceNotifsRes);
  const aliceNotifs = aliceNotifsRes.body as Array<{ id: string; message: string; read: boolean }>;
  info(`Alice's notifications: ${aliceNotifs.length}`);
  aliceNotifs.forEach((n, i) => info(`  [${i + 1}] (read=${n.read}) ${n.message}`));

  step(`List notifications for Bob (userId=${bob.id})`);
  const bobNotifsRes = await api('GET', `/notifications?userId=${bob.id}`);
  assert('Bob notifications', 200, bobNotifsRes);
  const bobNotifs = bobNotifsRes.body as Array<{ id: string; message: string; read: boolean }>;
  info(`Bob's notifications: ${bobNotifs.length}`);
  bobNotifs.forEach((n, i) => info(`  [${i + 1}] (read=${n.read}) ${n.message}`));

  step('Mark first Alice notification as read');
  if (aliceNotifs.length === 0) {
    info('(Alice has no notifications to mark)');
  } else {
    const markRes = await api('PUT', `/notifications/${aliceNotifs[0].id}/read`);
    assert('Mark notification read', 200, markRes);
    show('Marked notification', markRes.body);
  }

  step('Verify notification is now read');
  if (aliceNotifs.length > 0) {
    const verifyRes = await api('GET', '/notifications');
    assert('Verify read status', 200, verifyRes);
    const notifs = verifyRes.body as Array<{ id: string; read: boolean }>;
    const found = notifs.find(n => n.id === aliceNotifs[0].id);
    info(`Notification read status: ${found?.read}`);
  }

  step('Attempt to mark non-existent notification (should be 404)');
  const badNotifRes = await api('PUT', '/notifications/no-such-id/read');
  assert('Non-existent notification → 404', 404, badNotifRes);

  // ── 6. CLEANUP / DELETE OPERATIONS ────────────────────────────────────────
  header('6. CLEANUP / DELETE OPERATIONS');

  step('Delete Task 3');
  const deleteTask3Res = await api('DELETE', `/tasks/${task3.id}`);
  assert('Delete task 3', 204, deleteTask3Res);

  step('Verify Task 3 is gone (should be 404)');
  const missingTask3Res = await api('GET', `/tasks/${task3.id}`);
  assert('Deleted task → 404', 404, missingTask3Res);

  step('Delete Project Beta');
  const deleteProjRes = await api('DELETE', `/projects/${project2.id}`);
  assert('Delete project Beta', 204, deleteProjRes);

  step('Delete user Carol');
  const deleteCarolRes = await api('DELETE', `/users/${carol.id}`);
  assert('Delete Carol', 204, deleteCarolRes);

  step('Verify Carol is gone (should be 404)');
  const missingCarolRes = await api('GET', `/users/${carol.id}`);
  assert('Deleted user → 404', 404, missingCarolRes);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  header('DEMO COMPLETE');

  // Final state
  const finalUsers = (await api('GET', '/users')).body as unknown[];
  const finalProjects = (await api('GET', '/projects')).body as unknown[];
  const finalTasks = (await api('GET', '/tasks')).body as unknown[];
  const finalComments = (await api('GET', '/comments')).body as unknown[];
  const finalNotifs = (await api('GET', '/notifications')).body as unknown[];

  console.log(`\n  ${GREEN}${BOLD}Final system state:${RESET}`);
  info(`  Users        : ${finalUsers.length}`);
  info(`  Projects     : ${finalProjects.length}`);
  info(`  Tasks        : ${finalTasks.length}`);
  info(`  Comments     : ${finalComments.length}`);
  info(`  Notifications: ${finalNotifs.length}`);

  console.log(`\n${GREEN}${BOLD}All assertions passed! ✓${RESET}\n`);

  server.close();
}

main().catch(err => {
  console.error('\n\x1b[31mDemo failed:\x1b[0m', err);
  process.exit(1);
});
