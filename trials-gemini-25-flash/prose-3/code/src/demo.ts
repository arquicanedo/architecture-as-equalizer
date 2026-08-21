import { request, ClientRequest, IncomingMessage } from 'http';

const API_BASE_URL = 'http://localhost:3000';

interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}

async function makeRequest<T>(method: string, path: string, body?: any): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = request(options, (res: IncomingMessage) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        let parsedData: T | undefined;
        let error: string | undefined;
        try {
          if (data) {
            parsedData = JSON.parse(data);
          }
        } catch (e: any) {
          error = data || 'Failed to parse JSON response';
        }
        resolve({
          status: res.statusCode || 500,
          data: parsedData,
          error: error,
        });
      });
    });

    req.on('error', (e: Error) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Define types for entities as they are returned from the API
interface UserResponse { id: string; name: string; email: string; }
interface ProjectResponse { id: string; name: string; description: string; memberIds: string[]; }
interface TaskResponse { id: string; projectId: string; title: string; description: string; status: string; assigneeId?: string; }
interface CommentResponse { id: string; taskId: string; authorId: string; text: string; createdAt: number; }
interface NotificationResponse { id: string; userId: string; message: string; read: boolean; createdAt: number; }

async function demo() {
  console.log('Starting API Demo...');

  // Wait for the server to start (manual intervention or a small delay might be needed in real script)
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  // --- Users --- 
  console.log('\n--- USERS ---');
  let user1Id: string = '';
  let user2Id: string = '';

  const newUser1 = await makeRequest<UserResponse>('POST', '/users', { name: 'Demo User 1', email: 'demo1@example.com' });
  console.log('Created User 1:', newUser1.data);
  if (newUser1.data) user1Id = newUser1.data.id;

  const newUser2 = await makeRequest<UserResponse>('POST', '/users', { name: 'Demo User 2', email: 'demo2@example.com' });
  console.log('Created User 2:', newUser2.data);
  if (newUser2.data) user2Id = newUser2.data.id;

  const allUsers = await makeRequest<UserResponse[]>('GET', '/users');
  console.log('All Users:', allUsers.data);

  // --- Projects ---
  console.log('\n--- PROJECTS ---');
  let projectId: string = '';

  const newProject = await makeRequest<ProjectResponse>('POST', '/projects', { name: 'Demo Project', description: 'A project for demonstration' });
  console.log('Created Project:', newProject.data);
  if (newProject.data) projectId = newProject.data.id;

  if (projectId && user1Id) {
    const addMember = await makeRequest<ProjectResponse>('POST', `/projects/${projectId}/members`, { userId: user1Id });
    console.log('Added User 1 to project:', addMember.data);
  }

  const projectDetails = await makeRequest<ProjectResponse>('GET', `/projects/${projectId}`);
  console.log('Project Details:', projectDetails.data);

  // --- Tasks ---
  console.log('\n--- TASKS ---');
  let task1Id: string = '';
  let task2Id: string = '';

  const newTask1 = await makeRequest<TaskResponse>('POST', '/tasks', {
    projectId: projectId,
    title: 'Implement Login',
    description: 'Develop the user authentication module.',
    status: 'todo',
    assigneeId: user1Id,
  });
  console.log('Created Task 1:', newTask1.data);
  if (newTask1.data) task1Id = newTask1.data.id;

  const newTask2 = await makeRequest<TaskResponse>('POST', '/tasks', {
    projectId: projectId,
    title: 'Design UI',
    description: 'Create mockups for the new UI.',
    status: 'todo',
    assigneeId: user2Id,
  });
  console.log('Created Task 2:', newTask2.data);
  if (newTask2.data) task2Id = newTask2.data.id;

  if (task1Id && user2Id) {
    const assignTask = await makeRequest<TaskResponse>('PUT', `/tasks/${task1Id}/assign`, { assigneeId: user2Id });
    console.log('Reassigned Task 1 to User 2:', assignTask.data);
  }

  if (task1Id) {
    const updateStatus = await makeRequest<TaskResponse>('PUT', `/tasks/${task1Id}/status`, { status: 'in-progress' });
    console.log('Updated Task 1 status:', updateStatus.data);
  }

  const projectTasks = await makeRequest<TaskResponse[]>('GET', `/tasks?projectId=${projectId}`);
  console.log('Tasks for Demo Project:', projectTasks.data);

  // --- Comments ---
  console.log('\n--- COMMENTS ---');
  let comment1Id: string = '';

  if (task1Id && user1Id) {
    const newComment = await makeRequest<CommentResponse>('POST', '/comments', {
      taskId: task1Id,
      authorId: user1Id,
      text: 'Starting work on this task.',
    });
    console.log('Added Comment 1:', newComment.data);
    if (newComment.data) comment1Id = newComment.data.id;
  }

  if (task1Id && user2Id) {
    const newComment2 = await makeRequest<CommentResponse>('POST', '/comments', {
      taskId: task1Id,
      authorId: user2Id,
      text: 'Let me know if you need help.',
    });
    console.log('Added Comment 2:', newComment2.data);
  }

  const taskComments = await makeRequest<CommentResponse[]>('GET', `/comments?taskId=${task1Id}`);
  console.log('Comments for Task 1:', taskComments.data);

  // --- Notifications ---
  console.log('\n--- NOTIFICATIONS ---');

  if (user1Id) {
    const user1Notifications = await makeRequest<NotificationResponse[]>('GET', `/notifications?userId=${user1Id}`);
    console.log('User 1 Notifications (before read):', user1Notifications.data);
    if (user1Notifications.data && user1Notifications.data.length > 0) {
      const notifId = user1Notifications.data[0].id;
      const readNotif = await makeRequest<NotificationResponse>('PUT', `/notifications/${notifId}/read`);
      console.log('Marked User 1 notification as read:', readNotif.data);
    }
    const user1NotificationsAfterRead = await makeRequest<NotificationResponse[]>('GET', `/notifications?userId=${user1Id}`);
    console.log('User 1 Notifications (after read):', user1NotificationsAfterRead.data);
  }

  if (user2Id) {
    const user2Notifications = await makeRequest<NotificationResponse[]>('GET', `/notifications?userId=${user2Id}`);
    console.log('User 2 Notifications:', user2Notifications.data);
  }

  console.log('\nAPI Demo Complete.');
}

demo().catch(console.error);
