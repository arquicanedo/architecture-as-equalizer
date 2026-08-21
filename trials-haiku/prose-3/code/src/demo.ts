/**
 * Demo script - Exercises all features of the Task Management API
 */

import { createServer, request as httpRequest } from 'http';
import { URL } from 'url';
import { eventBus } from './event-bus';
import { UserService } from './services/user-service';
import { ProjectService } from './services/project-service';
import { TaskService } from './services/task-service';
import { CommentService } from './services/comment-service';
import { NotificationService } from './services/notification-service';
import { APIRouter } from './api-router';

const PORT = 3001;

async function main() {
  // Initialize services
  const userService = new UserService();
  const projectService = new ProjectService();
  const taskService = new TaskService(eventBus);
  const commentService = new CommentService(eventBus);
  const notificationService = new NotificationService(
    eventBus,
    taskService,
    userService
  );

  // Initialize API router
  const router = new APIRouter(
    userService,
    projectService,
    taskService,
    commentService,
    notificationService
  );

  // Create and start server
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    await router.handleRequest(req, res);
  });

  server.listen(PORT, async () => {
    console.log(`\n📋 Task Management API Demo Server Started on port ${PORT}\n`);

    // Small delay to ensure server is ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // Test helper function
      const makeRequest = (
        method: string,
        path: string,
        body?: any
      ): Promise<any> => {
        return new Promise((resolve, reject) => {
          const url = new URL(`http://localhost:${PORT}${path}`);
          const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
              'Content-Type': 'application/json',
            },
          };

          const req = httpRequest(options, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                resolve({
                  status: res.statusCode,
                  body: data ? JSON.parse(data) : null,
                });
              } catch (e) {
                resolve({ status: res.statusCode, body: data });
              }
            });
          });

          req.on('error', reject);
          if (body) {
            req.write(JSON.stringify(body));
          }
          req.end();
        });
      };

      console.log('🚀 Running demo scenarios...\n');

      // 1. Create users
      console.log('1️⃣  Creating users...');
      const user1Res = await makeRequest('POST', '/users', {
        name: 'Alice Johnson',
        email: 'alice@example.com',
      });
      const user1 = user1Res.body;
      console.log(`   ✓ Created user: ${user1.name} (${user1.id})`);

      const user2Res = await makeRequest('POST', '/users', {
        name: 'Bob Smith',
        email: 'bob@example.com',
      });
      const user2 = user2Res.body;
      console.log(`   ✓ Created user: ${user2.name} (${user2.id})`);

      const user3Res = await makeRequest('POST', '/users', {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
      });
      const user3 = user3Res.body;
      console.log(`   ✓ Created user: ${user3.name} (${user3.id})\n`);

      // 2. Create a project
      console.log('2️⃣  Creating a project...');
      const projectRes = await makeRequest('POST', '/projects', {
        name: 'Website Redesign',
        description: 'Redesign the company website with modern UI/UX',
      });
      const project = projectRes.body;
      console.log(`   ✓ Created project: ${project.name} (${project.id})\n`);

      // 3. Add members to project
      console.log('3️⃣  Adding members to project...');
      await makeRequest('POST', `/projects/${project.id}/members`, {
        userId: user1.id,
      });
      console.log(`   ✓ Added ${user1.name} to project`);

      await makeRequest('POST', `/projects/${project.id}/members`, {
        userId: user2.id,
      });
      console.log(`   ✓ Added ${user2.name} to project`);

      await makeRequest('POST', `/projects/${project.id}/members`, {
        userId: user3.id,
      });
      console.log(`   ✓ Added ${user3.name} to project\n`);

      // 4. Create tasks
      console.log('4️⃣  Creating tasks...');
      const task1Res = await makeRequest('POST', '/tasks', {
        projectId: project.id,
        title: 'Design mockups',
        description: 'Create high-fidelity mockups for the new design',
      });
      const task1 = task1Res.body;
      console.log(`   ✓ Created task: ${task1.title} (${task1.id})`);

      const task2Res = await makeRequest('POST', '/tasks', {
        projectId: project.id,
        title: 'Implement frontend',
        description: 'Build the frontend based on approved mockups',
      });
      const task2 = task2Res.body;
      console.log(`   ✓ Created task: ${task2.title} (${task2.id})`);

      const task3Res = await makeRequest('POST', '/tasks', {
        projectId: project.id,
        title: 'Setup backend API',
        description: 'Create API endpoints for the new website',
      });
      const task3 = task3Res.body;
      console.log(`   ✓ Created task: ${task3.title} (${task3.id})\n`);

      // 5. Assign tasks
      console.log('5️⃣  Assigning tasks...');
      await makeRequest('PUT', `/tasks/${task1.id}/assign`, {
        userId: user1.id,
      });
      console.log(`   ✓ Assigned "${task1.title}" to ${user1.name}`);

      await makeRequest('PUT', `/tasks/${task2.id}/assign`, {
        userId: user2.id,
      });
      console.log(`   ✓ Assigned "${task2.title}" to ${user2.name}`);

      await makeRequest('PUT', `/tasks/${task3.id}/assign`, {
        userId: user3.id,
      });
      console.log(`   ✓ Assigned "${task3.title}" to ${user3.name}\n`);

      // 6. Update task statuses
      console.log('6️⃣  Updating task statuses...');
      await makeRequest('PUT', `/tasks/${task1.id}/status`, {
        status: 'in-progress',
      });
      console.log(`   ✓ Updated "${task1.title}" status to "in-progress"`);

      await makeRequest('PUT', `/tasks/${task1.id}/status`, {
        status: 'done',
      });
      console.log(`   ✓ Updated "${task1.title}" status to "done"`);

      await makeRequest('PUT', `/tasks/${task2.id}/status`, {
        status: 'in-progress',
      });
      console.log(`   ✓ Updated "${task2.title}" status to "in-progress"\n`);

      // 7. Add comments
      console.log('7️⃣  Adding comments to tasks...');
      const comment1Res = await makeRequest('POST', '/comments', {
        taskId: task2.id,
        authorId: user1.id,
        text: 'Looking good! The design aligns well with our brand guidelines.',
      });
      console.log(`   ✓ ${user1.name} commented on "${task2.title}"`);

      const comment2Res = await makeRequest('POST', '/comments', {
        taskId: task2.id,
        authorId: user3.id,
        text: 'We should ensure mobile responsiveness is tested thoroughly.',
      });
      console.log(`   ✓ ${user3.name} commented on "${task2.title}"\n`);

      // 8. Check notifications
      console.log('8️⃣  Checking notifications...');
      const user1NotifRes = await makeRequest('GET', `/notifications?userId=${user1.id}`);
      const user1Notifs = user1NotifRes.body;
      console.log(`   ✓ ${user1.name} has ${user1Notifs.length} notifications:`);
      user1Notifs.forEach((notif: any) => {
        console.log(`     - ${notif.message}`);
      });

      const user2NotifRes = await makeRequest('GET', `/notifications?userId=${user2.id}`);
      const user2Notifs = user2NotifRes.body;
      console.log(`   ✓ ${user2.name} has ${user2Notifs.length} notifications:`);
      user2Notifs.forEach((notif: any) => {
        console.log(`     - ${notif.message}`);
      });

      const user3NotifRes = await makeRequest('GET', `/notifications?userId=${user3.id}`);
      const user3Notifs = user3NotifRes.body;
      console.log(`   ✓ ${user3.name} has ${user3Notifs.length} notifications:`);
      user3Notifs.forEach((notif: any) => {
        console.log(`     - ${notif.message}`);
      });

      console.log('\n✅ Demo completed successfully!\n');

      // Get project summary
      console.log('📊 Final Project Summary:');
      const projectRes2 = await makeRequest('GET', `/projects/${project.id}`);
      const finalProject = projectRes2.body;
      console.log(`   Project: ${finalProject.name}`);
      console.log(`   Members: ${finalProject.members.length}`);

      const tasksRes = await makeRequest('GET', `/tasks?projectId=${project.id}`);
      const tasks = tasksRes.body;
      const doneTasks = tasks.filter((t: any) => t.status === 'done').length;
      const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress')
        .length;
      const todoTasks = tasks.filter((t: any) => t.status === 'todo').length;
      console.log(`   Tasks - Done: ${doneTasks}, In Progress: ${inProgressTasks}, Todo: ${todoTasks}`);

      const allCommentsRes = await makeRequest('GET', '/comments');
      const allComments = allCommentsRes.body;
      console.log(`   Total Comments: ${allComments.length}\n`);

      console.log('🎉 All features demonstrated successfully!\n');
      process.exit(0);
    } catch (error) {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    }
  });
}

main().catch(console.error);
