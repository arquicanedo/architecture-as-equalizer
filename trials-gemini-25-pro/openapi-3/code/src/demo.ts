import http from 'http';
import { startServer } from './main';

const PORT = 3000; // Make sure this matches the port in main.ts
const BASE_URL = `http://localhost:${PORT}`;

let server: http.Server;

// Helper to make HTTP requests
function request(method: string, path: string, body?: any): Promise<{ statusCode: number, data: any }> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            `${BASE_URL}${path}`,
            { 
                method, 
                headers: { 'Content-Type': 'application/json' }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    let parsedData = null;
                    try {
                        if (data) parsedData = JSON.parse(data);
                    } catch(e) {
                        console.error("Failed to parse response JSON:", data);
                        return reject(e);
                    }
                    resolve({ statusCode: res.statusCode || 500, data: parsedData });
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
    console.log('--- Starting Demo ---');

    try {
        // 1. Create Users
        console.log('\n--- 1. Creating Users ---');
        const user1 = (await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' })).data;
        const user2 = (await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' })).data;
        console.log('Created User 1:', user1);
        console.log('Created User 2:', user2);

        // 2. Create Project
        console.log('\n--- 2. Creating Project ---');
        const project = (await request('POST', '/projects', { name: 'New Website', description: 'A project to build a new website.' })).data;
        console.log('Created Project:', project);

        // 3. Add Members to Project
        console.log('\n--- 3. Adding Members ---');
        await request('POST', `/projects/${project.id}/members`, { userId: user1.id });
        const updatedProject = (await request('POST', `/projects/${project.id}/members`, { userId: user2.id })).data;
        console.log('Project with Members:', updatedProject);

        // 4. Create Tasks
        console.log('\n--- 4. Creating Tasks ---');
        const task1 = (await request('POST', '/tasks', { projectId: project.id, title: 'Design Homepage', description: 'Wireframe and design the homepage.' })).data;
        const task2 = (await request('POST', '/tasks', { projectId: project.id, title: 'Implement API', description: 'Build the backend API.' })).data;
        console.log('Created Task 1:', task1);
        console.log('Created Task 2:', task2);

        // 5. Assign Tasks
        console.log('\n--- 5. Assigning Tasks ---');
        const assignedTask1 = (await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id })).data;
        console.log('Assigned Task 1 to Alice:', assignedTask1);
        // Check Alice's notifications
        let aliceNotifs = (await request('GET', `/notifications?userId=${user1.id}`)).data;
        console.log("Alice's Notifications:", aliceNotifs);

        // 6. Change Task Status
        console.log('\n--- 6. Changing Task Status ---');
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        const doneTask1 = (await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' })).data;
        console.log('Task 1 status changed to done:', doneTask1);
        // Check Alice's notifications again
        aliceNotifs = (await request('GET', `/notifications?userId=${user1.id}`)).data;
        console.log("Alice's Notifications:", aliceNotifs);
        
        // Mark a notification as read
        const notifToRead = aliceNotifs.find((n:any) => !n.read);
        if(notifToRead) {
             const readNotif = (await request('PUT', `/notifications/${notifToRead.id}/read`)).data;
             console.log('Marked notification as read:', readNotif);
        }

        // 7. Add Comments
        console.log('\n--- 7. Adding Comments ---');
        const comment = (await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: 'Great job on the design!' })).data;
        console.log('Bob added a comment to Task 1:', comment);
        // Check Bob's notifications (he gets one for his own comment in this simple setup)
        const bobNotifs = (await request('GET', `/notifications?userId=${user2.id}`)).data;
        console.log("Bob's Notifications:", bobNotifs);

        // 8. List all entities
        console.log('\n--- 8. Final State ---');
        console.log('All Users:', (await request('GET', '/users')).data);
        console.log('All Projects:', (await request('GET', '/projects')).data);
        console.log('All Tasks for Project:', (await request('GET', `/tasks?projectId=${project.id}`)).data);
        console.log('All Comments for Task:', (await request('GET', `/comments?taskId=${task1.id}`)).data);
        console.log("Alice's final notifications:", (await request('GET', `/notifications?userId=${user1.id}`)).data);

        console.log('\n--- Demo Complete ---');

    } catch (error) {
        console.error('\n--- Demo Failed ---');
        console.error(error);
    } finally {
        console.log('--- Stopping Server ---');
        server.close();
        process.exit();
    }
}

// Start the server and then run the demo
server = startServer();
server.on('listening', runDemo);
