import { bootstrap } from './main';
import * as http from 'http';

const API_BASE_URL = 'http://localhost:3000';

// Helper to make fetch requests
async function callApi(method: string, path: string, body?: any): Promise<any> {
    const url = `${API_BASE_URL}${path}`;
    const options: RequestInit = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    console.log(`\n---> ${method} ${url} ${body ? JSON.stringify(body) : ''}`);
    const response = await fetch(url, options);
    const text = await response.text();
    try {
        const json = text ? JSON.parse(text) : null;
        console.log(`<--- ${response.status} ${JSON.stringify(json || {})}`);
        if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${json ? json.message : 'Unknown error'}`);
        }
        return json;
    } catch (e) {
        console.error(`<--- ${response.status} Raw Response: ${text}`);
        throw e;
    }
}

async function runDemo() {
    let server: http.Server | undefined;
    try {
        server = await bootstrap(); // Start the server

        console.log('\n--- Starting Demo ---');

        // 1. Create Users
        const user1 = await callApi('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        const user2 = await callApi('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        const user3 = await callApi('POST', '/users', { name: 'Charlie', email: 'charlie@example.com' });

        const users = await callApi('GET', '/users');
        console.log('All Users:', users.map((u:any) => u.name));

        // 2. Create Project
        const project1 = await callApi('POST', '/projects', { name: 'Website Redesign', description: 'Redesign company website' });
        
        // 3. Add Members to Project
        await callApi('POST', `/projects/${project1.id}/members`, { userId: user1.id });
        await callApi('POST', `/projects/${project1.id}/members`, { userId: user2.id });
        const updatedProject = await callApi('GET', `/projects/${project1.id}`);
        console.log('Project with members:', updatedProject.name, updatedProject.memberIds);

        // 4. Create Tasks
        const task1 = await callApi('POST', '/tasks', { title: 'Design UI Mockups', description: 'Create UI wireframes and mockups', projectId: project1.id });
        const task2 = await callApi('POST', '/tasks', { title: 'Develop Frontend', description: 'Implement React components', projectId: project1.id });
        const task3 = await callApi('POST', '/tasks', { title: 'Setup Database', description: 'Configure PostgreSQL', projectId: project1.id });
        
        const projectTasks = await callApi('GET', `/tasks?projectId=${project1.id}`);
        console.log('Project Tasks:', projectTasks.map((t:any) => t.title));

        // 5. Assign Tasks
        const assignedTask1 = await callApi('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        const assignedTask2 = await callApi('PUT', `/tasks/${task2.id}/assign`, { assigneeId: user2.id });
        console.log(`Task 1 assigned to: ${assignedTask1.assigneeId}`);
        console.log(`Task 2 assigned to: ${assignedTask2.assigneeId}`);

        // 6. Change Status
        const inProgressTask1 = await callApi('PUT', `/tasks/${task1.id}/status`, { newStatus: 'in-progress' });
        console.log(`Task 1 status: ${inProgressTask1.status}`);
        const doneTask1 = await callApi('PUT', `/tasks/${task1.id}/status`, { newStatus: 'done' });
        console.log(`Task 1 status: ${doneTask1.status}`);

        // Invalid status transition (should fail)
        try {
            await callApi('PUT', `/tasks/${task1.id}/status`, { newStatus: 'todo' });
        } catch (e: any) {
            console.log('Expected error for invalid status transition:', e.message);
        }

        // 7. Add Comments
        const comment1 = await callApi('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Looks good, ready for review.' });
        console.log('Comment 1 added by user2 on task1.');
        const comment2 = await callApi('POST', '/comments', { taskId: task2.id, authorId: user1.id, body: 'Started working on this.' });
        console.log('Comment 2 added by user1 on task2.');

        const task1Comments = await callApi('GET', `/comments?taskId=${task1.id}`);
        console.log('Task 1 Comments:', task1Comments.map((c:any) => c.body));

        // 8. Check Notifications
        console.log('\n--- Checking Notifications ---');
        const user1Notifications = await callApi('GET', `/notifications?userId=${user1.id}`);
        console.log(`User 1 (${user1.name}) Notifications:`, user1Notifications.map((n:any) => ({ message: n.message, read: n.read })));

        const user2Notifications = await callApi('GET', `/notifications?userId=${user2.id}`);
        console.log(`User 2 (${user2.name}) Notifications:`, user2Notifications.map((n:any) => ({ message: n.message, read: n.read })));

        // Mark a notification as read
        if (user1Notifications.length > 0) {
            const firstNotif = user1Notifications[0];
            await callApi('PUT', `/notifications/${firstNotif.id}/read`);
            const updatedUser1Notifications = await callApi('GET', `/notifications?userId=${user1.id}`);
            console.log(`User 1 (${user1.name}) Notifications (after marking one as read):`, updatedUser1Notifications.map((n:any) => ({ message: n.message, read: n.read })));
        }

        console.log('\n--- Demo Complete ---');

    } catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    } finally {
        if (server) {
            console.log('Closing server...');
            server.close(() => {
                console.log('Server closed.');
            });
        }
    }
}

runDemo();
