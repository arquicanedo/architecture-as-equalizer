import * as http from 'http';

const PORT = 3000;

const makeRequest = (options: http.RequestOptions, data?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (e) {
                    reject(e)
                }
            });
        });
        req.on('error', (e) => reject(e));
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

async function runDemo() {
    try {
        console.log('--- Starting Demo ---');

        // 1. Create users
        console.log('Creating users...');
        const user1 = await makeRequest({ port: PORT, path: '/users', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { name: 'Alice', email: 'alice@example.com' });
        const user2 = await makeRequest({ port: PORT, path: '/users', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { name: 'Bob', email: 'bob@example.com' });
        console.log('Users created:', user1, user2);

        // 2. Create a project
        console.log('Creating a project...');
        const project = await makeRequest({ port: PORT, path: '/projects', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { name: 'My First Project', description: 'A cool project' });
        console.log('Project created:', project);

        // 3. Add members to the project
        console.log('Adding members to the project...');
        await makeRequest({ port: PORT, path: `/projects/${project.id}/members`, method: 'POST', headers: { 'Content-Type': 'application/json' } }, { userId: user1.id });
        await makeRequest({ port: PORT, path: `/projects/${project.id}/members`, method: 'POST', headers: { 'Content-Type': 'application/json' } }, { userId: user2.id });
        console.log('Members added to project.');

        // 4. Create a task
        console.log('Creating a task...');
        const task = await makeRequest({ port: PORT, path: '/tasks', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { projectId: project.id, title: 'Implement feature X', description: 'It should do Y and Z' });
        console.log('Task created:', task);

        // 5. Assign the task to a user
        console.log(`Assigning task ${task.id} to user ${user1.id} ...`);
        await makeRequest({ port: PORT, path: `/tasks/${task.id}/assign`, method: 'PUT', headers: { 'Content-Type': 'application/json' } }, { assigneeId: user1.id });
        console.log('Task assigned.');

        // 6. Check notifications for the assigned user
        console.log(`Checking notifications for user ${user1.id} ...`);
        let notifications = await makeRequest({ port: PORT, path: `/notifications?userId=${user1.id}`, method: 'GET' });
        console.log('Notifications:', notifications);

        // 7. Add a comment to the task
        console.log('Adding a comment to the task...');
        await makeRequest({ port: PORT, path: '/comments', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { taskId: task.id, authorId: user2.id, text: 'Great work!' });
        console.log('Comment added.');

        // 8. Check notifications for the task assignee again
        console.log(`Checking notifications for user ${user1.id} again...`);
        notifications = await makeRequest({ port: PORT, path: `/notifications?userId=${user1.id}`, method: 'GET' });
        console.log('Notifications:', notifications);

        // 9. Change task status
        console.log('Updating task status...');
        await makeRequest({ port: PORT, path: `/tasks/${task.id}/status`, method: 'PUT', headers: { 'Content-Type': 'application/json' } }, { status: 'in-progress' });
        console.log('Task status updated.');

        // 10. Check notifications for the task assignee again
        console.log(`Checking notifications for user ${user1.id} again...`);
        notifications = await makeRequest({ port: PORT, path: `/notifications?userId=${user1.id}`, method: 'GET' });
        console.log('Notifications:', notifications);

        console.log('--- Demo Finished ---');

    } catch (error) {
        console.error('Demo failed:', error);
    } finally {
        // The server will keep running, so we might need to manually stop this script.
        // For a real-world scenario, the server would be started in a separate process.
        process.exit();
    }
}

// We need to wait a bit for the server to start
setTimeout(runDemo, 1000);
