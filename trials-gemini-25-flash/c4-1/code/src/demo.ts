import * as http from 'http';

const BASE_URL = 'http://localhost:3000';

async function request(method: string, path: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => {
                if (res.statusCode && (res.statusCode >= 200 && res.statusCode < 300)) {
                    try {
                        resolve(body ? JSON.parse(body) : null);
                    } catch (e) {
                        resolve(body); // May not be JSON (e.g., 204 No Content) or empty
                    }
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runDemo() {
    console.log('--- Task Management API Demo ---');

    let user1: any, user2: any, project1: any, task1: any, task2: any, comment1: any;

    try {
        // 1. Create Users
        console.log('\n--- Creating Users ---');
        user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        console.log('Created User 1:', user1);
        user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('Created User 2:', user2);

        // 2. Create Project
        console.log('\n--- Creating Project ---');
        project1 = await request('POST', '/projects', { name: 'Project Alpha', description: 'First project' });
        console.log('Created Project 1:', project1);

        // 3. Add Members to Project
        console.log('\n--- Adding Members to Project ---');
        project1 = await request('POST', `/projects/${project1.id}/members`, { userId: user1.id });
        console.log('Added Alice to Project 1:', project1);
        project1 = await request('POST', `/projects/${project1.id}/members`, { userId: user2.id });
        console.log('Added Bob to Project 1:', project1);

        // 4. Create Tasks
        console.log('\n--- Creating Tasks ---');
        task1 = await request('POST', '/tasks', {
            title: 'Implement User Auth',
            description: 'Set up JWT authentication for users.',
            projectId: project1.id,
        });
        console.log('Created Task 1:', task1);

        task2 = await request('POST', '/tasks', {
            title: 'Design Database Schema',
            description: 'Create ER diagrams for data models.',
            projectId: project1.id,
        });
        console.log('Created Task 2:', task2);
        
        const project1Tasks = await request('GET', `/tasks?projectId=${project1.id}`);
        console.log('Tasks for Project 1:', project1Tasks);


        // 5. Assign Task
        console.log('\n--- Assigning Task ---');
        task1 = await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        console.log('Assigned Task 1 to Alice:', task1);

        // 6. Change Task Status
        console.log('\n--- Changing Task Status ---');
        task1 = await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        console.log('Task 1 status to in-progress:', task1);
        task1 = await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
        console.log('Task 1 status to done:', task1);

        // Try invalid status transition (should throw error)
        try {
            console.log('Attempting invalid status change (done -> todo)...');
            await request('PUT', `/tasks/${task1.id}/status`, { status: 'todo' });
        } catch (error: any) {
            console.log('Invalid status change failed as expected:', error.message);
        }

        // 7. Add Comments
        console.log('\n--- Adding Comments ---');
        comment1 = await request('POST', '/comments', {
            taskId: task1.id,
            authorId: user2.id,
            body: 'Good progress Alice!',
        });
        console.log('Added Comment 1 to Task 1:', comment1);

        const task1Comments = await request('GET', `/comments?taskId=${task1.id}`);
        console.log('Comments for Task 1:', task1Comments);

        // 8. Check Notifications
        console.log('\n--- Checking Notifications ---');
        const aliceNotifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log("Alice's Notifications:", aliceNotifications);

        const bobNotifications = await request('GET', `/notifications?userId=${user2.id}`);
        console.log("Bob's Notifications:", bobNotifications);

        // Mark a notification as read
        if (aliceNotifications.length > 0) {
            const firstNotifId = aliceNotifications[0].id;
            const updatedNotif = await request('PUT', `/notifications/${firstNotifId}/read`);
            console.log(`Marked notification ${firstNotifId} as read:`, updatedNotif);
        }

        const aliceNotificationsAfterRead = await request('GET', `/notifications?userId=${user1.id}`);
        console.log("Alice's Notifications (after read):", aliceNotificationsAfterRead);


        console.log('\n--- Demo Complete! ---');

    } catch (error: any) {
        console.error('\n--- Demo Failed ---');
        console.error(error.message);
    }
}

// Small delay to ensure server is up if main.ts is started in parallel
// In a real scenario, this would be a more robust readiness check.
setTimeout(runDemo, 1000); // Wait 1 second for the server to start
