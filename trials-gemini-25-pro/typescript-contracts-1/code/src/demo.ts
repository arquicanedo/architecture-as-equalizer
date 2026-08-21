import { request } from 'http';

const BASE_URL = 'http://localhost:3000';

// Helper to make HTTP requests and log results
async function apiCall(method: string, path: string, body: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`\n>> ${method} ${path}` + (body ? ` with body ${JSON.stringify(body)}` : ''));
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = request(BASE_URL + path, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`<< ${res.statusCode} ${res.statusMessage}`);
        if (data) {
            const jsonData = JSON.parse(data);
            console.log(jsonData);
            resolve(jsonData);
        } else {
            resolve(null);
        }
      });
    });

    req.on('error', (e) => {
        console.error(`!! Request failed: ${e.message}`);
        reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Main demo sequence
async function runDemo() {
    console.log('--- Starting API Demo ---');
    await new Promise(res => setTimeout(res, 1000)); // Wait for server to be ready

    try {
        // 1. Create users
        const user1 = await apiCall('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        const user2 = await apiCall('POST', '/users', { name: 'Bob', email: 'bob@example.com' });

        // 2. Create a project
        const project = await apiCall('POST', '/projects', { name: 'New Website', description: 'A project to build a new website.' });

        // 3. Add members to the project
        await apiCall('POST', `/projects/${project.id}/members`, { userId: user1.id });
        await apiCall('POST', `/projects/${project.id}/members`, { userId: user2.id });

        // 4. Create tasks
        const task1 = await apiCall('POST', '/tasks', { title: 'Design Homepage', description: 'Create a mockup for the new homepage.', projectId: project.id });
        const task2 = await apiCall('POST', '/tasks', { title: 'Setup Database', description: 'Setup the initial schema for Postgres.', projectId: project.id });
        
        // 5. Assign tasks
        await apiCall('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });

        // 6. Check notifications for Alice (user1)
        await apiCall('GET', `/notifications?userId=${user1.id}`);

        // 7. Change task status
        await apiCall('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        
        // 8. Add a comment
        const comment = await apiCall('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: "How is the design coming along?" });

        // 9. Check notifications for Alice again (should have status change and comment notifications)
        const notifications = await apiCall('GET', `/notifications?userId=${user1.id}`);

        // 10. Mark a notification as read
        if (notifications && notifications.length > 0) {
            await apiCall('PUT', `/notifications/${notifications[0].id}/read`);
        }
        
        // Final check of Alice's notifications
        await apiCall('GET', `/notifications?userId=${user1.id}`);

        console.log('\n--- Demo Completed Successfully ---');

    } catch (error) {
        console.error('\n--- Demo Failed ---');
        console.error(error);
    } 
}

runDemo();
