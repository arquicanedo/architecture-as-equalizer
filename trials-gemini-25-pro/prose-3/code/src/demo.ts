import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function post(path: string, data: any) {
    return new Promise((resolve, reject) => {
        const req = http.request(`${BASE_URL}${path}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => resolve(JSON.parse(body)));
            }
        );
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function get(path: string) {
     return new Promise((resolve, reject) => {
        const req = http.get(`${BASE_URL}${path}`,
            (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => resolve(JSON.parse(body)));
            }
        );
        req.on('error', reject);
        req.end();
    });
}

async function put(path: string, data: any) {
    return new Promise((resolve, reject) => {
        const req = http.request(`${BASE_URL}${path}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => resolve(JSON.parse(body)));
            }
        );
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}


async function runDemo() {
    console.log('--- Starting Demo ---');

    // Create users
    console.log('Creating users...');
    const user1 = await post('/users', { name: 'Alice', email: 'alice@example.com' }) as any;
    const user2 = await post('/users', { name: 'Bob', email: 'bob@example.com' }) as any;
    console.log(`Created user: ${user1.name} (ID: ${user1.id})`);
    console.log(`Created user: ${user2.name} (ID: ${user2.id})`);

    // Create a project
    console.log('\nCreating a project...');
    const project = await post('/projects', { name: 'My First Project', description: 'A demo project', ownerId: user1.id }) as any;
    console.log(`Created project: ${project.name} (ID: ${project.id})`);

    // Add a member to the project
    console.log('\nAdding a member to the project...');
    await post(`/projects/${project.id}/members`, { userId: user2.id });
    console.log(`${user2.name} added to project ${project.name}`);

    // Create a task
    console.log('\nCreating a task...');
    const task = await post('/tasks', { projectId: project.id, title: 'Implement feature X', description: 'Should be done by EOD' }) as any;
    console.log(`Created task: ${task.title} (ID: ${task.id})`);

    // Assign the task
    console.log('\nAssigning the task...');
    await put(`/tasks/${task.id}/assign`, { assigneeId: user2.id });
    console.log(`Task ${task.id} assigned to ${user2.name}`);

    // Check notifications for user2
    console.log(`\nChecking notifications for ${user2.name}...`);
    let notifications: any = await get(`/notifications?userId=${user2.id}`);
    console.log(notifications[0].message);

    // Update task status
    console.log('\nUpdating task status...');
    await put(`/tasks/${task.id}/status`, { status: 'in-progress' });
    console.log(`Task ${task.id} status updated to in-progress`);

    // Check notifications for user2 again
    console.log(`\nChecking notifications for ${user2.name} again...`);
    notifications = await get(`/notifications?userId=${user2.id}`);
    console.log(notifications[0].message);

    // Add a comment
    console.log('\nAdding a comment to the task...');
    const comment = await post('/comments', { taskId: task.id, authorId: user1.id, text: 'How is it going?' }) as any;
    console.log(`Comment added to task ${task.id}`);

    // Check notifications for user2 again
    console.log(`\nChecking notifications for ${user2.name} again...`);
    notifications = await get(`/notifications?userId=${user2.id}`);
    console.log(notifications[0].message);

    // Mark notification as read
    const notificationToRead = notifications[0];
    await put(`/notifications/${notificationToRead.id}/read`, {});
    console.log(`\nNotification ${notificationToRead.id} marked as read.`);

    // Get all users
    console.log('\nGetting all users...');
    const users = await get('/users');
    console.log(users);
    
    console.log('\n--- Demo Finished ---');
    process.exit(0);
}

// A small delay to allow the server to start
setTimeout(runDemo, 1000);
