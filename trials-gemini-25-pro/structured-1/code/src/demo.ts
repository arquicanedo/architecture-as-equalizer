
import http from 'http';

// --- Helper Functions for HTTP Requests ---

function request(method: string, path: string, body?: any): Promise<any> {
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
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    const errorResponse = data ? JSON.parse(data) : { message: `HTTP Error: ${res.statusCode}` };
                    reject(new Error(`Request failed with status ${res.statusCode}: ${errorResponse.message}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Request error: ${e.message}`));
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}


// --- Main Demo Logic ---

async function runDemo() {
    try {
        console.log('--- Starting Task Management API Demo ---');

        // 1. Create Users
        console.log('\n--- 1. Creating Users ---');
        const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        console.log('Created User 1:', user1);
        const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('Created User 2:', user2);

        // 2. Create Project
        console.log('\n--- 2. Creating Project ---');
        const project = await request('POST', '/projects', { name: 'Website Redesign', description: 'A project to redesign the company website.' });
        console.log('Created Project:', project);

        // 3. Add Members to Project
        console.log('\n--- 3. Adding Members to Project ---');
        await request('POST', `/projects/${project.id}/members`, { memberId: user1.id });
        const updatedProject = await request('POST', `/projects/${project.id}/members`, { memberId: user2.id });
        console.log('Project with Members:', updatedProject);

        // 4. Create Tasks
        console.log('\n--- 4. Creating Tasks ---');
        const task1 = await request('POST', '/tasks', { title: 'Design Homepage Mockup', description: 'Create a new mockup for the homepage.', projectId: project.id });
        console.log('Created Task 1:', task1);
        const task2 = await request('POST', '/tasks', { title: 'Implement Authentication', description: 'Set up user login and registration.', projectId: project.id });
        console.log('Created Task 2:', task2);

        // 5. Assign Tasks
        console.log('\n--- 5. Assigning Tasks ---');
        const assignedTask1 = await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        console.log('Assigned Task 1 to Alice:', assignedTask1);
        
        // Let's check Alice's notifications
        await sleep(50); // wait for event processing
        let aliceNotifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log("Alice's notifications after assignment:", aliceNotifications);


        // 6. Change Task Status
        console.log('\n--- 6. Changing Task Status ---');
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        const finalTaskStatus = await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
        console.log('Changed Task 1 status to done:', finalTaskStatus);
        
        // Check notifications again for status change
        await sleep(50);
        aliceNotifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log("Alice's notifications after status change:", aliceNotifications);


        // 7. Add a Comment
        console.log('\n--- 7. Adding a Comment ---');
        const comment = await request('POST', '/comments', { taskId: task1.id, authorId: user2.id, body: "Great design! I've approved it." });
        console.log('Bob added a comment on Task 1:', comment);

        // Check Alice's notifications for the new comment
        await sleep(50);
        aliceNotifications = await request('GET', `/notifications?userId=${user1.id}`);
        console.log("Alice's notifications after comment:", aliceNotifications);


        // 8. Mark Notification as Read
        console.log('\n--- 8. Marking a Notification as Read ---');
        const notificationToRead = aliceNotifications[0];
        if (notificationToRead) {
            const readNotification = await request('PUT', `/notifications/${notificationToRead.id}/read`);
            console.log('Marked notification as read:', readNotification);
            
            const finalNotifications = await request('GET', `/notifications?userId=${user1.id}`);
            console.log("Alice's final notifications:", finalNotifications);
        }

        console.log('\n--- Demo Finished Successfully ---');

    } catch (error) {
        console.error('\n--- Demo Failed ---');
        console.error(error);
        process.exit(1);
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// NOTE: This script assumes the server from `main.ts` is running in a separate process.
// To run the demo:
// 1. `npx tsx src/main.ts`
// 2. In a new terminal: `npx tsx src/demo.ts`
runDemo();
