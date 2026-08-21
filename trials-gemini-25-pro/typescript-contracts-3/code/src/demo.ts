import * as http from 'http';
import { server } from './main';

const PORT = 3000;

async function request(method: string, path: string, data?: any): Promise<any> {
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

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                try {
                    if (responseBody) {
                        resolve(JSON.parse(responseBody));
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runDemo() {
    console.log('--- Starting Demo ---');

    // 1. Create users
    console.log('Creating users...');
    const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
    const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
    console.log('Users created:', user1, user2);

    // 2. Create a project
    console.log('\nCreating a project...');
    const project = await request('POST', '/projects', { name: 'My First Project', description: 'A demo project' });
    console.log('Project created:', project);

    // 3. Add members to the project
    console.log('\nAdding members to the project...');
    await request('POST', `/projects/${project.id}/members`, { userId: user1.id });
    await request('POST', `/projects/${project.id}/members`, { userId: user2.id });
    const updatedProject = await request('GET', `/projects/${project.id}`);
    console.log('Project with members:', updatedProject);

    // 4. Create tasks
    console.log('\nCreating tasks...');
    const task1 = await request('POST', '/tasks', { title: 'Implement feature X', description: '...', projectId: project.id });
    const task2 = await request('POST', '/tasks', { title: 'Fix bug Y', description: '...', projectId: project.id });
    console.log('Tasks created:', task1, task2);

    // 5. Assign tasks
    console.log('\nAssigning tasks...');
    await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
    console.log(`Assigned task ${task1.id} to user ${user1.id}`);

    // 6. Check notifications for user1 (task assignment)
    console.log(`\nChecking notifications for ${user1.name}...`);
    let user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
    console.log('User1 notifications:', user1Notifications);
    // Mark as read
    await request('PUT', `/notifications/${user1Notifications[0].id}/read`);

    // 7. Change task status
    console.log('\nChanging task status...');
    await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
    console.log(`Changed task ${task1.id} status to in-progress`);

    // 8. Check notifications for user1 (status change)
    console.log(`\nChecking notifications for ${user1.name} again...`);
    user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
    console.log('User1 notifications:', user1Notifications);
    await request('PUT', `/notifications/${user1Notifications[0].id}/read`);

    // 9. Add a comment
    console.log('\nAdding a comment from Bob...');
    const comment = await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great progress!' });
    console.log('Comment added:', comment);

    // 10. Check notifications for user1 (new comment)
    console.log(`\nChecking notifications for ${user1.name} one last time...`);
    user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
    console.log('User1 notifications:', user1Notifications);

    console.log('\n--- Demo Finished ---');
}

// Wait for the server to be ready before running the demo
const interval = setInterval(async () => {
    try {
        // A simple health check endpoint would be better, but this will do.
        await request('GET', '/users'); 
        clearInterval(interval);
        await runDemo();
        server.close();
    } catch (e) {
        // Server not ready yet
    }
}, 100);
