import http from 'http';
import { server } from './router';

const PORT = 3000;

const request = (method: string, path: string, body?: any): Promise<any> => {
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
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve({});
                    }
                } else {
                    reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
};

async function runDemo() {
    console.log('--- Starting Demo ---');

    // Create users
    console.log('Creating users...');
    const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
    const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
    console.log('Users created:', user1, user2);

    // Create project
    console.log('\nCreating project...');
    const project = await request('POST', '/projects', { name: 'My First Project', description: 'A demo project', ownerId: user1.id });
    console.log('Project created:', project);

    // Add member to project
    console.log('\nAdding Bob to project...');
    await request('POST', `/projects/${project.id}/members`, { memberId: user2.id });
    const updatedProject = await request('GET', `/projects/${project.id}`);
    console.log('Project members:', updatedProject.memberIds);

    // Create tasks
    console.log('\nCreating tasks...');
    const task1 = await request('POST', '/tasks', { title: 'Implement feature X', description: '...', projectId: project.id });
    const task2 = await request('POST', '/tasks', { title: 'Fix bug Y', description: '...', projectId: project.id });
    console.log('Tasks created:', task1, task2);

    // Assign task
    console.log('\nAssigning task 1 to Alice...');
    await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
    const assignedTask1 = await request('GET', `/tasks/${task1.id}`);
    console.log('Assigned task:', assignedTask1);

    // Change task status
    console.log('\nChanging task 1 status...');
    await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
    await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
    const completedTask1 = await request('GET', `/tasks/${task1.id}`);
    console.log('Completed task:', completedTask1);

    // Add comment
    console.log('\nAdding comment to task 1...');
    const comment = await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great job!' });
    console.log('Comment added:', comment);

    // Check notifications for Alice
    console.log('\nChecking notifications for Alice...');
    const aliceNotifications = await request('GET', `/notifications?userId=${user1.id}`);
    console.log('Alice\'s notifications:', aliceNotifications);

    // Check notifications for Bob
    console.log('\nChecking notifications for Bob...');
    const bobNotifications = await request('GET', `/notifications?userId=${user2.id}`);
    console.log('Bob\'s notifications:', bobNotifications);

    console.log('\n--- Demo Finished ---');
}

const serverInstance = server.listen(PORT, async () => {
    console.log(`Demo server running on port ${PORT}`);
    try {
        await runDemo();
    } catch (error) {
        console.error('\n--- Demo Failed ---');
        console.error(error);
    } finally {
        serverInstance.close(() => {
            console.log('\nDemo server stopped.');
            process.exit(0);
        });
    }
});
