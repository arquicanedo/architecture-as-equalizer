import * as http from 'http';
import { startServer } from './main';

const PORT = 3000;

async function runDemo() {
    // Start the server
    const server = startServer();
    console.log('--- Task Management API Demo ---\n');

    try {
        // Step 1: Create Users
        console.log('1. Creating users...');
        const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('   - Created:', user1);
        console.log('   - Created:', user2);

        // Step 2: Create a Project
        console.log('\n2. Creating a project...');
        const project = await request('POST', '/projects', { name: 'New Website', description: 'Build a new company website' });
        console.log('   - Created:', project);

        // Step 3: Add Members to Project
        console.log('\n3. Adding members to the project...');
        await request('POST', `/projects/${project.id}/members`, { memberId: user1.id });
        await request('POST', `/projects/${project.id}/members`, { memberId: user2.id });
        const updatedProject = await request('GET', `/projects/${project.id}`);
        console.log('   - Project members:', updatedProject.memberIds);

        // Step 4: Create Tasks
        console.log('\n4. Creating tasks...');
        const task1 = await request('POST', '/tasks', { title: 'Design Homepage', description: 'Create a mockup', projectId: project.id });
        const task2 = await request('POST', '/tasks', { title: 'Implement API', description: 'Setup the backend', projectId: project.id });
        console.log('   - Created:', task1);
        console.log('   - Created:', task2);

        // Step 5: Assign Tasks
        console.log('\n5. Assigning tasks...');
        const assignedTask1 = await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        console.log(`   - Assigned task '${assignedTask1.title}' to ${user1.name}`);
        // Let's check notifications for Alice (user1)
        await sleep(50); // wait for event to be processed
        let user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Alice's notifications:`, user1Notifications.map((n: any) => n.message));

        // Step 6: Change Task Status
        console.log('\n6. Changing task status...');
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        const finalTaskStatus = await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
        console.log(`   - Changed status for '${finalTaskStatus.title}' to '${finalTaskStatus.status}'`);
        await sleep(50);
        user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Alice's new notifications:`, user1Notifications.map((n: any) => n.read ? `[READ] ${n.message}`: n.message).slice(1));

        // Step 7: Add a Comment
        console.log('\n7. Adding a comment...');
        const comment = await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great design!' });
        console.log(`   - ${user2.name} commented on '${task1.title}': "${comment.body}"`);
        await sleep(50);
        user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Alice's latest notification:`, user1Notifications[0].message);
        
        // Step 8: Mark notification as read
        console.log('\n8. Marking notification as read...');
        const notificationToRead = user1Notifications[0];
        await request('PUT', `/notifications/${notificationToRead.id}/read`);
        const finalNotifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Alice's final notifications:`, finalNotifications);

    } catch (error) {
        console.error('\nAn error occurred during the demo:', error);
    } finally {
        // Close the server
        server.close(() => {
            console.log('\n--- Demo Complete, Server Closed ---');
            process.exit();
        });
    }
}

// Helper to make HTTP requests
function request(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const options: http.RequestOptions = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res: http.IncomingMessage) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runDemo();
