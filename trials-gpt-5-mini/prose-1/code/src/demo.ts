import { EventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { createServerWithServices } from './api-router';

async function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function runDemo() {
  const eventBus = new EventBus();
  const users = new UserService();
  const projects = new ProjectService();
  const tasks = new TaskService(eventBus);
  const comments = new CommentService(eventBus);
  const notifications = new NotificationService(eventBus);

  const port = 4000;
  const server = createServerWithServices(port, { eventBus, users, projects, tasks, comments, notifications });
  server.listen(() => console.log(`Demo server listening on http://localhost:${port}`));

  // create two users
  const alice = users.createUser('Alice', 'alice@example.com');
  const bob = users.createUser('Bob', 'bob@example.com');
  console.log('Created users:', alice, bob);

  // create project
  const proj = projects.createProject('Demo Project', 'A sample project');
  console.log('Created project:', proj);

  // add members
  projects.addMember(proj.id, alice.id);
  projects.addMember(proj.id, bob.id);
  console.log('Project members:', projects.getProject(proj.id)?.members);

  // create task
  const task = tasks.createTask('Implement feature X', proj.id, 'Details about feature X');
  console.log('Created task:', task);

  // assign to Alice
  tasks.assign(task.id, alice.id);
  console.log('Assigned task to Alice');

  // add comment by Bob
  const comment = comments.addComment(task.id, bob.id, 'Please consider edge case Y');
  // publish enriched event (router normally does this)
  eventBus.publish('comment.added', { comment, task });
  console.log('Bob added comment:', comment);

  // change status to in-progress
  tasks.setStatus(task.id, 'in-progress');
  console.log('Task moved to in-progress');

  // change status to done
  tasks.setStatus(task.id, 'done');
  console.log('Task moved to done');

  // list notifications for Alice
  const aliceNotifs = notifications.listNotifications({ userId: alice.id });
  console.log('Alice notifications:', aliceNotifs);

  // mark first as read
  if (aliceNotifs[0]) notifications.markRead(aliceNotifs[0].id);
  console.log('After marking read:', notifications.listNotifications({ userId: alice.id }));

  // keep server running briefly
  await delay(500);
  server.close(() => console.log('Demo server closed'));
}

runDemo().catch((e) => console.error(e));
