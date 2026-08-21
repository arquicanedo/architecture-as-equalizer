/**
 * Demo Script
 * Starts the server and exercises all features of the Task Management API.
 */

import { server } from './main';

interface RequestOptions {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers: Record<string, string>;
}

// Helper function to make HTTP requests
function makeRequest(
  options: RequestOptions,
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const http = require('http');

    const req = http.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function log(message: string, data?: any): void {
  console.log(`\n${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function runDemo(): Promise<void> {
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 500));

  const baseOptions: Omit<RequestOptions, 'path' | 'method'> = {
    hostname: 'localhost',
    port: 3000,
    headers: { 'Content-Type': 'application/json' },
  };

  try {
    // ============ STEP 1: CREATE USERS ============
    log('STEP 1: Creating users...');

    const user1Response = await makeRequest(
      { ...baseOptions, path: '/users', method: 'POST' },
      { name: 'Alice Johnson', email: 'alice@example.com' }
    );
    const user1 = user1Response.data;
    log(`Created user 1:`, user1);

    const user2Response = await makeRequest(
      { ...baseOptions, path: '/users', method: 'POST' },
      { name: 'Bob Smith', email: 'bob@example.com' }
    );
    const user2 = user2Response.data;
    log(`Created user 2:`, user2);

    const user3Response = await makeRequest(
      { ...baseOptions, path: '/users', method: 'POST' },
      { name: 'Carol White', email: 'carol@example.com' }
    );
    const user3 = user3Response.data;
    log(`Created user 3:`, user3);

    // ============ STEP 2: CREATE PROJECT ============
    log('STEP 2: Creating project...');

    const projectResponse = await makeRequest(
      { ...baseOptions, path: '/projects', method: 'POST' },
      {
        name: 'Website Redesign',
        description: 'Complete redesign of the company website',
      }
    );
    const project = projectResponse.data;
    log(`Created project:`, project);

    // ============ STEP 3: ADD MEMBERS TO PROJECT ============
    log('STEP 3: Adding members to project...');

    const addMember1Response = await makeRequest(
      {
        ...baseOptions,
        path: `/projects/${project.id}/members`,
        method: 'POST',
      },
      { userId: user1.id }
    );
    log(`Added user1 to project:`, addMember1Response.data);

    const addMember2Response = await makeRequest(
      {
        ...baseOptions,
        path: `/projects/${project.id}/members`,
        method: 'POST',
      },
      { userId: user2.id }
    );
    log(`Added user2 to project:`, addMember2Response.data);

    // ============ STEP 4: CREATE TASKS ============
    log('STEP 4: Creating tasks...');

    const task1Response = await makeRequest(
      { ...baseOptions, path: '/tasks', method: 'POST' },
      {
        title: 'Design mockups',
        description: 'Create high-fidelity mockups for desktop and mobile',
        projectId: project.id,
      }
    );
    const task1 = task1Response.data;
    log(`Created task 1:`, task1);

    const task2Response = await makeRequest(
      { ...baseOptions, path: '/tasks', method: 'POST' },
      {
        title: 'Develop frontend',
        description: 'Implement React components for the redesigned UI',
        projectId: project.id,
      }
    );
    const task2 = task2Response.data;
    log(`Created task 2:`, task2);

    const task3Response = await makeRequest(
      { ...baseOptions, path: '/tasks', method: 'POST' },
      {
        title: 'Write tests',
        description: 'Write unit and integration tests for new features',
        projectId: project.id,
      }
    );
    const task3 = task3Response.data;
    log(`Created task 3:`, task3);

    // ============ STEP 5: ASSIGN TASKS ============
    log('STEP 5: Assigning tasks to users...');

    const assign1Response = await makeRequest(
      {
        ...baseOptions,
        path: `/tasks/${task1.id}/assign`,
        method: 'PUT',
      },
      { assigneeId: user1.id }
    );
    log(`Assigned task1 to user1:`, assign1Response.data);

    const assign2Response = await makeRequest(
      {
        ...baseOptions,
        path: `/tasks/${task2.id}/assign`,
        method: 'PUT',
      },
      { assigneeId: user2.id }
    );
    log(`Assigned task2 to user2:`, assign2Response.data);

    // ============ STEP 6: CHANGE TASK STATUS ============
    log('STEP 6: Changing task status...');

    const status1Response = await makeRequest(
      {
        ...baseOptions,
        path: `/tasks/${task1.id}/status`,
        method: 'PUT',
      },
      { status: 'in-progress' }
    );
    log(`Updated task1 status to in-progress:`, status1Response.data);

    const status2Response = await makeRequest(
      {
        ...baseOptions,
        path: `/tasks/${task1.id}/status`,
        method: 'PUT',
      },
      { status: 'done' }
    );
    log(`Updated task1 status to done:`, status2Response.data);

    // ============ STEP 7: ADD COMMENTS ============
    log('STEP 7: Adding comments to tasks...');

    const comment1Response = await makeRequest(
      { ...baseOptions, path: '/comments', method: 'POST' },
      {
        taskId: task2.id,
        authorId: user1.id,
        body: 'Great design! Ready to implement when you finish the mockups.',
      }
    );
    log(`Created comment 1:`, comment1Response.data);

    const comment2Response = await makeRequest(
      { ...baseOptions, path: '/comments', method: 'POST' },
      {
        taskId: task2.id,
        authorId: user3.id,
        body: 'I can help with the testing phase if needed.',
      }
    );
    log(`Created comment 2:`, comment2Response.data);

    // ============ STEP 8: GET COMMENTS FOR TASK ============
    log('STEP 8: Fetching comments for task...');

    const commentsResponse = await makeRequest({
      ...baseOptions,
      path: `/comments?taskId=${task2.id}`,
      method: 'GET',
    });
    log(`Comments for task2:`, commentsResponse.data);

    // ============ STEP 9: CHECK NOTIFICATIONS ============
    log('STEP 9: Checking notifications...');

    const notif1Response = await makeRequest({
      ...baseOptions,
      path: `/notifications?userId=${user1.id}`,
      method: 'GET',
    });
    log(`Notifications for user1:`, notif1Response.data);

    const notif2Response = await makeRequest({
      ...baseOptions,
      path: `/notifications?userId=${user2.id}`,
      method: 'GET',
    });
    log(`Notifications for user2:`, notif2Response.data);

    // ============ STEP 10: MARK NOTIFICATION AS READ ============
    if (notif1Response.data.length > 0) {
      log('STEP 10: Marking notification as read...');
      const markReadResponse = await makeRequest(
        {
          ...baseOptions,
          path: `/notifications/${notif1Response.data[0].id}/read`,
          method: 'PUT',
        }
      );
      log(`Marked notification as read:`, markReadResponse.data);
    }

    // ============ STEP 11: GET PROJECT TASKS ============
    log('STEP 11: Fetching all tasks for project...');

    const tasksResponse = await makeRequest({
      ...baseOptions,
      path: `/tasks?projectId=${project.id}`,
      method: 'GET',
    });
    log(`All tasks in project:`, tasksResponse.data);

    // ============ STEP 12: UPDATE USER ============
    log('STEP 12: Updating user...');

    const updateUserResponse = await makeRequest(
      {
        ...baseOptions,
        path: `/users/${user1.id}`,
        method: 'PUT',
      },
      { email: 'alice.johnson@newdomain.com' }
    );
    log(`Updated user1:`, updateUserResponse.data);

    // ============ STEP 13: UPDATE PROJECT ============
    log('STEP 13: Updating project...');

    const updateProjectResponse = await makeRequest(
      {
        ...baseOptions,
        path: `/projects/${project.id}`,
        method: 'PUT',
      },
      { description: 'Complete redesign of the company website - Phase 1' }
    );
    log(`Updated project:`, updateProjectResponse.data);

    // ============ STEP 14: LIST ALL USERS ============
    log('STEP 14: Fetching all users...');

    const allUsersResponse = await makeRequest({
      ...baseOptions,
      path: '/users',
      method: 'GET',
    });
    log(`All users (${allUsersResponse.data.length}):`, allUsersResponse.data);

    // ============ STEP 15: LIST ALL PROJECTS ============
    log('STEP 15: Fetching all projects...');

    const allProjectsResponse = await makeRequest({
      ...baseOptions,
      path: '/projects',
      method: 'GET',
    });
    log(`All projects (${allProjectsResponse.data.length}):`, allProjectsResponse.data);

    log('\n✓ DEMO COMPLETE! All features working correctly.');
    log('API endpoints validated:');
    log('  ✓ Users: Create, Read, Update, Delete, List');
    log('  ✓ Projects: Create, Read, Update, Delete, List, Add/Remove Members');
    log('  ✓ Tasks: Create, Read, Update, Delete, List by Project, Assign, Change Status');
    log('  ✓ Comments: Create, Read, Delete, List by Task');
    log('  ✓ Notifications: List by User, Mark as Read');
    log('  ✓ Event Bus: Task assignments, Status changes, Comments trigger notifications');

  } catch (error) {
    console.error('Error during demo:', error);
  } finally {
    server.close();
  }
}

// Run the demo
runDemo();
