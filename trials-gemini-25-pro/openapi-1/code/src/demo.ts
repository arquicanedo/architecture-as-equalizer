import * as http from 'http';

const HOST = 'localhost';
const PORT = 8000;

// --- API Client Helper ---

async function request(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const options: http.RequestOptions = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : null);
                } else {
                    reject(
                        new Error(
                            `Request failed with status ${res.statusCode}: ${data}`
                        )
                    );
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// --- Demo Script ---

async function runDemo() {
    console.log('--- Task Management API Demo ---\n');

    try {
        // 1. Create Users
        console.log('1. Creating users...');
        const user1 = await request('POST', '/users', { name: 'Alice', email: 'alice@example.com' });
        const user2 = await request('POST', '/users', { name: 'Bob', email: 'bob@example.com' });
        console.log('   - Created:', user1.name, `(ID: ${user1.id})`);
        console.log('   - Created:', user2.name, `(ID: ${user2.id})`);
        console.log('\n');

        // 2. Create a Project
        console.log('2. Creating a project...');
        const project = await request('POST', '/projects', {
            name: 'New Website Launch',
            description: 'Launch the new company website by Q4.',
        });
        console.log('   - Created:', project.name, `(ID: ${project.id})`);
        console.log('\n');

        // 3. Add Members to Project
        console.log('3. Adding members to the project...');
        await request('POST', `/projects/${project.id}/members`, { userId: user1.id });
        await request('POST', `/projects/${project.id}/members`, { userId: user2.id });
        const updatedProject = await request('GET', `/projects/${project.id}`);
        console.log(`   - Members in "${updatedProject.name}":`, updatedProject.memberIds);
        console.log('\n');

        // 4. Create Tasks
        console.log('4. Creating tasks...');
        const task1 = await request('POST', '/tasks', {
            title: 'Design Homepage Mockup',
            description: 'Create a high-fidelity mockup in Figma.',
            projectId: project.id,
        });
        const task2 = await request('POST', '/tasks', {
            title: 'Develop Authentication API',
            description: 'Implement JWT-based authentication.',
            projectId: project.id,
        });
        console.log(`   - Created Task: "${task1.title}"`);
        console.log(`   - Created Task: "${task2.title}"`);
        console.log('\n');

        // 5. Assign Tasks
        console.log('5. Assigning tasks...');
        await request('PUT', `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
        await request('PUT', `/tasks/${task2.id}/assign`, { assigneeId: user2.id });
        console.log(`   - Assigned "${task1.title}" to ${user1.name}`);
        console.log(`   - Assigned "${task2.title}" to ${user2.name}`);
        console.log('\n');
        
        // 6. Change Task Status
        console.log('6. Updating task status...');
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'in-progress' });
        console.log(`   - Status of "${task1.title}" changed to in-progress`);
        await request('PUT', `/tasks/${task1.id}/status`, { status: 'done' });
        console.log(`   - Status of "${task1.title}" changed to done`);
        console.log('\n');

        // 7. Add a Comment
        console.log('7. Adding a comment...');
        const comment = await request('POST', '/comments', {
            taskId: task2.id,
            authorId: user2.id,
            body: 'I\'m starting on this now.',
        });
        console.log(`   - ${user2.name} commented on "${task2.title}"`);
        const comments = await request('GET', `/comments?taskId=${task2.id}`);
        console.log('   - Comments on task:', comments);
        console.log('\n');
        
        // 8. Check Notifications
        console.log('8. Checking notifications for users...');
        const user1Notifs = await request('GET', `/notifications?userId=${user1.id}`);
        const user2Notifs = await request('GET', `/notifications?userId=${user2.id}`);
        console.log(`   - ${user1.name}'s notifications:`, user1Notifs.map((n:any) => n.message));
        console.log(`   - ${user2.name}'s notifications:`, user2Notifs.map((n:any) => n.message));
        console.log('\n');

        console.log('--- Demo Complete ---\n');

    } catch (error) {
        console.error('\n--- Demo Failed ---');
        console.error(error);
        // In a real script, you might want to stop the server here.
    }
}

// A brief delay to allow the server to start before running the demo.
setTimeout(runDemo, 1000);
