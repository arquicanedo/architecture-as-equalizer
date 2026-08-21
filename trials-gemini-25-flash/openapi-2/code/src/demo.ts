import * as http from 'http';
import { ApiRouter } from './router';

const PORT = 3001; // Use a different port for demo to avoid conflict with main.ts

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

async function makeRequest<T>(method: string, path: string, body?: any): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = data ? JSON.parse(data) : undefined;
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ data: parsedData });
                    } else {
                        resolve({ error: parsedData?.error || `HTTP Error ${res.statusCode}` });
                    }
                } catch (e) {
                    reject(e);
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
}

async function demo() {
    console.log("Starting demo...");

    const router = new ApiRouter();
    router.init();
    const server = http.createServer(router.getRequestListener());

    server.listen(PORT, async () => {
        console.log(`Demo server running on port ${PORT}`);
        try {
            // 1. Create Users
            console.log('\n--- Creating Users ---');
            const user1 = (await makeRequest<{ id: string }>('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).data;
            const user2 = (await makeRequest<{ id: string }>('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).data;
            const user3 = (await makeRequest<{ id: string }>('POST', '/users', { name: 'Charlie', email: 'charlie@example.com' })).data;
            console.log('Created users:', user1?.id, user2?.id, user3?.id);

            if (!user1 || !user2 || !user3) return console.error("Failed to create users");

            // 2. Create Project
            console.log('\n--- Creating Project ---');
            const project1 = (await makeRequest<{ id: string }>('POST', '/projects', { name: 'Project X', description: 'First project' })).data;
            console.log('Created project:', project1?.id);
            if (!project1) return console.error("Failed to create project");

            // 3. Add Members to Project
            console.log('\n--- Adding Members to Project ---');
            await makeRequest('POST', `/projects/${project1.id}/members`, { userId: user1.id });
            await makeRequest('POST', `/projects/${project1.id}/members`, { userId: user2.id });
            const updatedProject = (await makeRequest('GET', `/projects/${project1.id}`)).data;
            console.log('Project members:', (updatedProject as any)?.memberIds);

            // 4. Create Tasks
            console.log('\n--- Creating Tasks ---');
            const task1 = (await makeRequest<{ id: string, title: string }>('POST', '/tasks', { title: 'Task A', description: 'Description A', projectId: project1.id })).data;
            const task2 = (await makeRequest<{ id: string, title: string }>('POST', '/tasks', { title: 'Task B', description: 'Description B', projectId: project1.id })).data;
            console.log('Created tasks:', task1?.id, task2?.id);
            if (!task1 || !task2) return console.error("Failed to create tasks");

            // 5. Assign Tasks
            console.log('\n--- Assigning Tasks ---');
            await makeRequest('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
            await makeRequest('PUT', `/tasks/${task2.id}/assign`, { assigneeId: user2.id });
            const assignedTask1 = (await makeRequest('GET', `/tasks/${task1.id}`)).data;
            const assignedTask2 = (await makeRequest('GET', `/tasks/${task2.id}`)).data;
            console.log('Assigned task 1 to:', (assignedTask1 as any)?.assigneeId);
            console.log('Assigned task 2 to:', (assignedTask2 as any)?.assigneeId);

            // 6. Change Task Status
            console.log('\n--- Changing Task Status ---');
            await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
            await makeRequest('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
            const doneTask1 = (await makeRequest('GET', `/tasks/${task1.id}`)).data;
            console.log('Task 1 status:', (doneTask1 as any)?.status);

            // 7. Add Comments
            console.log('\n--- Adding Comments ---');
            const comment1 = (await makeRequest<{ id: string }>('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great work!' })).data;
            const comment2 = (await makeRequest<{ id: string }>('POST', '/comments', { taskId: task1.id, authorId: user3.id, body: 'Keep it up!' })).data;
            console.log('Added comments:', comment1?.id, comment2?.id);
            if (!comment1) return console.error("Failed to add comment");

            // 8. Check Notifications
            console.log('\n--- Checking Notifications ---');
            const user1Notifications = (await makeRequest<any[]>('GET', `/notifications?userId=${user1.id}`)).data;
            const user2Notifications = (await makeRequest<any[]>('GET', `/notifications?userId=${user2.id}`)).data;
            const user3Notifications = (await makeRequest<any[]>('GET', `/notifications?userId=${user3.id}`)).data;
            console.log('User 1 Notifications:\n', user1Notifications?.map(n => n.message));
            console.log('User 2 Notifications:\n', user2Notifications?.map(n => n.message));
            console.log('User 3 Notifications:\n', user3Notifications?.map(n => n.message));

            // 9. Mark Notification as Read
            if (user1Notifications && user1Notifications.length > 0) {
                console.log('\n--- Marking Notification as Read ---');
                await makeRequest('PUT', `/notifications/${user1Notifications[0].id}/read`);
                const updatedNotif = (await makeRequest<any>('GET', `/notifications?userId=${user1.id}`)).data?.[0];
                console.log('First User 1 notification read status:', updatedNotif?.read);
            }

        } catch (error) {
            console.error('Demo failed:', error);
        } finally {
            server.close(() => {
                console.log('\nDemo server closed.');
                process.exit(0);
            });
        }
    });
}

demo();
