
import * as http from 'http';
import { server } from './main';

const PORT = 3000;

async function runDemo() {
    console.log('Starting demo...');

    // Helper to make requests
    const request = (method: string, path: string, data?: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: PORT,
                path,
                method,
                headers: { 'Content-Type': 'application/json' }
            }, (res: http.IncomingMessage) => {
                let body = '';
                res.on('data', (chunk: any) => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    };

    try {
        // Create users
        const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        console.log('Created user:', user1);
        const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('Created user:', user2);

        // Create project
        const project1 = await request('POST', '/projects', { name: 'My First Project', description: 'A demo project' });
        console.log('Created project:', project1);

        // Add members to project
        await request('POST', `/projects/${project1.id}/members`, { memberId: user1.id });
        await request('POST', `/projects/${project1.id}/members`, { memberId: user2.id });
        console.log('Added members to project');

        // Create task
        const task1 = await request('POST', '/tasks', { projectId: project1.id, title: 'Implement feature X', description: '...' });
        console.log('Created task:', task1);

        // Assign task
        await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        console.log(`Assigned task ${task1.id} to user ${user1.id}`);

        // Check notifications for user1
        let notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('User 1 notifications:', notifications);

        // Change task status
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        console.log(`Changed task ${task1.id} status to in-progress`);
        
        // Check notifications for user1 again
        notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('User 1 notifications:', notifications);
        
        // Add a comment
        const comment1 = await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, text: 'I can help with this!' });
        console.log('Added comment:', comment1);

        // Check notifications for user1 a third time
        notifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log('User 1 notifications:', notifications);

    } catch (error) {
        console.error('Demo failed:', error);
    } finally {
        server.close(() => {
            console.log('Server closed. Demo finished.');
        });
    }
}

// Wait for server to be ready before running demo
const interval = setInterval(() => {
    const req = http.get(`http://localhost:${PORT}`, (res: http.IncomingMessage) => {
        if (res.statusCode === 404) { // Assuming root path returns 404 as it is not defined in our router
            clearInterval(interval);
            runDemo();
        } 
    });
    req.on('error', (e: Error) => { /* ignore, server not up yet */ });
}, 200);
