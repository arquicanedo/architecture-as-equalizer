import http from 'http';

// Define a simple type for our API responses to avoid using 'any'
type ApiResponse = any;

const BASE_URL = 'http://localhost:3000';

function request(method: string, path: string, body?: object): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
        const req = http.request(`${BASE_URL}${path}`, { method }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
                try {
                    const parsedData = data ? JSON.parse(data) : {};
                    resolve(parsedData);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.setHeader('Content-Type', 'application/json');
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runDemo() {
    console.log('--- Starting Demo ---');

    try {
        // 1. Create Users
        console.log('\n1. Creating users...');
        const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('   - Created:', user1.name, user2.name);

        // 2. Create Project
        console.log('\n2. Creating a project...');
        const project = await request('POST', '/projects', { name: 'New Website', description: 'A project to build a new website.' });
        console.log('   - Created project:', project.name);

        // 3. Add members to project
        console.log('\n3. Adding members to project...');
        await request('POST', `/projects/${project.id}/members`, { memberId: user1.id });
        await request('POST', `/projects/${project.id}/members`, { memberId: user2.id });
        const updatedProject = await request('GET', `/projects/${project.id}`);
        console.log(`   - Project members: ${updatedProject.memberIds.length}`);

        // 4. Create tasks
        console.log('\n4. Creating tasks...');
        const task1 = await request('POST', '/tasks', { title: 'Design Homepage', description: 'Create a mockup for the homepage', projectId: project.id });
        const task2 = await request('POST', '/tasks', { title: 'Setup Database', description: 'Setup the production database', projectId: project.id });
        console.log('   - Created tasks:', task1.title, ',', task2.title);

        // 5. Assign tasks
        console.log('\n5. Assigning tasks...');
        await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        console.log(`   - Assigned "${task1.title}" to ${user1.name}`);

        // 6. Check notifications for user1
        console.log(`\n6. Checking notifications for ${user1.name}...`);
        let user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Found ${user1Notifications.length} notification(s):`);
        user1Notifications.forEach((n: ApiResponse) => console.log(`     - ${n.message}`));

        // 7. Change task status
        console.log('\n7. Changing task status...');
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        console.log(`   - Changed status for "${task1.title}" to in-progress`);

        // 8. Check notifications for user1 again
        console.log(`\n8. Checking notifications for ${user1.name} again...`);
        user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Found ${user1Notifications.length} new notification(s):`);
        user1Notifications.forEach((n: ApiResponse) => console.log(`     - ${n.message}`));

        // Mark notification as read
        if (user1Notifications.length > 0) {
            await request('PUT', `/notifications/${user1Notifications[0].id}/read`);
            console.log('   - Marked one notification as read.');
        }

        // 9. Add a comment
        console.log('\n9. Add a comment to a task...');
        await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great start on the design!' });
        console.log(`   - ${user2.name} added a comment to "${task1.title}"`);

        // 10. Check notifications for user1 (assignee)
        console.log(`\n10. Final notification check for ${user1.name}...`);
        user1Notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log(`   - Found ${user1Notifications.length} new notification(s):`);
        user1Notifications.forEach((n: ApiResponse) => console.log(`     - ${n.message}`));

    } catch (error: any) {
        console.error('\n--- Demo Failed ---');
        console.error(error.message);
        process.exit(1);
    }

    console.log('\n--- Demo Complete ---');
    // Stop the server process gracefully
    process.kill(process.pid, 'SIGINT');
}

// Give the server a moment to start up before running the demo
setTimeout(runDemo, 1000);
