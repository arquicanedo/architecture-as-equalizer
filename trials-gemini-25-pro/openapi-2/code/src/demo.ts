import http from 'http';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function request(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            `${BASE_URL}${path}`,
            {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data ? JSON.parse(data) : null);
                    } else {
                        reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            }
        );

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function runDemo() {
    console.log('--- Task Management API Demo ---');

    try {
        // 1. Create Users
        console.log('\n1. Creating users...');
        const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('  - Created:', user1);
        console.log('  - Created:', user2);

        // 2. Create Project
        console.log('\n2. Creating a project...');
        const project = await request('POST', '/projects', { name: 'New Website', description: 'Build the new company website.' });
        console.log('  - Created:', project);

        // 3. Add Members to Project
        console.log('\n3. Adding members to the project...');
        await request('POST', `/projects/${project.id}/members`, { userId: user1.id });
        await request('POST', `/projects/${project.id}/members`, { userId: user2.id });
        const updatedProject = await request('GET', `/projects/${project.id}`);
        console.log('  - Project members:', updatedProject.memberIds);

        // 4. Create Tasks
        console.log('\n4. Creating tasks...');
        const task1 = await request('POST', '/tasks', { title: 'Design Homepage', description: 'Create a mockup for the new homepage.', projectId: project.id });
        const task2 = await request('POST', '/tasks', { title: 'Implement API', description: 'Set up the backend API endpoints.', projectId: project.id });
        console.log('  - Created:', task1);
        console.log('  - Created:', task2);

        // 5. Assign Tasks
        console.log('\n5. Assigning tasks...');
        await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        console.log(`  - Assigned task "${task1.title}" to ${user1.name}`);

        // 6. Check Notifications for User 1 (Task Assignment)
        console.log(`\n6. Checking notifications for ${user1.name}...`);
        let user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('  - Notifications:', user1Notifications);

        // 7. Change Task Status
        console.log('\n7. Changing task status...');
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        console.log(`  - Changed status of "${task1.title}" to in-progress`);
        
        // 8. Check Notifications for User 1 (Status Change)
        console.log(`\n8. Checking notifications for ${user1.name} again...`);
        user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('  - Notifications:', user1Notifications);

        // 9. Add a Comment
        console.log('\n9. Adding a comment...');
        const comment = await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great design! Let me know if you need help with the CSS.' });
        console.log('  - Created comment:', comment);
        
        // 10. Check Notifications for User 1 (New Comment)
        console.log(`\n10. Checking notifications for ${user1.name} (the assignee)...`);
        user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('  - Notifications:', user1Notifications);
        
        // 11. Mark a notification as read
        console.log('\n11. Marking a notification as read...');
        const notificationToRead = user1Notifications[0];
        await request('PUT', `/notifications/${notificationToRead.id}/read`);
        const finalNotifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('  - Final notifications:', finalNotifications);

    } catch (error) {
        console.error('\n--- Demo Failed ---');
        console.error(error);
    } finally {
        // The main process will shut down the server
        process.exit(0);
    }
}

// Give the server a moment to start up
setTimeout(runDemo, 1000);
