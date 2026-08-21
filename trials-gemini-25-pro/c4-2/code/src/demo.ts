import http from 'http';

const PORT = 3000;

const request = (method: string, path: string, body?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res: http.IncomingMessage) => {
            let data = '';
            res.on('data', (chunk: Buffer) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                     if(data) {
                        resolve(JSON.parse(data));
                    } else {
                        resolve(null);
                    }
                } else {
                    reject({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (e: Error) => reject(e));
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

async function runDemo() {
    console.log('--- Starting Demo ---');

    // Create users
    console.log('1. Creating users...');
    const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
    const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
    console.log(`   - Created: ${user1.name} (ID: ${user1.id})`);
    console.log(`   - Created: ${user2.name} (ID: ${user2.id})`);

    // Create project
    console.log('\n2. Creating a project...');
    const project = await request('POST', '/projects', { name: 'New Website', description: 'A project to build a new website' });
    console.log(`   - Created project: "${project.name}" (ID: ${project.id})`);

    // Add members to project
    console.log('\n3. Adding members to the project...');
    await request('POST', `/projects/${project.id}/members`, { userId: user1.id });
    await request('POST', `/projects/${project.id}/members`, { userId: user2.id });
    console.log(`   - Added ${user1.name} and ${user2.name} to "${project.name}"`);

    // Create tasks
    console.log('\n4. Creating tasks...');
    const task1 = await request('POST', '/tasks', { title: 'Design Homepage', description: 'Mockups for the new homepage', projectId: project.id });
    const task2 = await request('POST', '/tasks', { title: 'Implement API', description: 'Build the backend API', projectId: project.id });
    console.log(`   - Created task: "${task1.title}"`);
    console.log(`   - Created task: "${task2.title}"`);

    // Assign tasks
    console.log('\n5. Assigning tasks...');
    await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
    console.log(`   - Assigned "${task1.title}" to ${user1.name}`);
    console.log(`   - Checking ${user1.name}'s notifications...`);
    let notifications: Notification[] = await request('GET', `/notifications?userId=${user1.id}`);
    console.log(`   - Found ${notifications.length} notification(s):`);
    notifications.forEach((n: Notification) => console.log(`     - "${n.message}"`));
    
    // Change task status
    console.log('\n6. Changing task status...');
    await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
    console.log(`   - Changed status of "${task1.title}" to in-progress`);
    
    // Add comments
    console.log('\n7. Adding comments...');
    await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'How is the design coming along?' });
    console.log(`   - ${user2.name} commented on "${task1.title}"`);
    console.log(`   - Checking ${user1.name}'s notifications...`);
    notifications = await request('GET', `/notifications?userId=${user1.id}`);
    notifications.forEach((n: Notification) => !n.read && console.log(`     - New: "${n.message}"`));

    // Mark notification as read
    const notifToRead = notifications.find((n: Notification) => !n.read);
    if(notifToRead) {
        console.log('\n8. Marking a notification as read...');
        await request('PUT', `/notifications/${notifToRead.id}/read`);
        console.log(`   - Marked notification "${notifToRead.message}" as read.`);
        notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - ${user1.name} now has ${notifications.length} unread notification(s).`);
    }

    console.log('\n--- Demo Finished ---');
}

// A small delay to ensure the server is up before running the demo
setTimeout(() => {
    runDemo().catch(err => {
        console.error('\n--- Demo Failed ---');
        console.error(err);
    });
}, 1000);
