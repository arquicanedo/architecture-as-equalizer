import { request } from "node:http";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function apiRequest(method: string, path: string, body: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = request(
      `${BASE_URL}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : null);
          } else {
            reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runDemo() {
    console.log("--- Starting Task Management API Demo ---");

    // 1. Create Users
    console.log("\n1. Creating users...");
    const user1 = await apiRequest("POST", "/users", { name: "Alice", email: "alice@example.com" });
    const user2 = await apiRequest("POST", "/users", { name: "Bob", email: "bob@example.com" });
    console.log("  - Created:", user1);
    console.log("  - Created:", user2);

    // 2. Create a Project
    console.log("\n2. Creating a project...");
    const project = await apiRequest("POST", "/projects", { name: "API Development", description: "Build the new Task API" });
    console.log("  - Created:", project);

    // 3. Add Members to Project
    console.log("\n3. Adding members to the project...");
    await apiRequest("POST", `/projects/${project.id}/members`, { userId: user1.id });
    await apiRequest("POST", `/projects/${project.id}/members`, { userId: user2.id });
    const updatedProject = await apiRequest("GET", `/projects/${project.id}`);
    console.log("  - Project members:", updatedProject.memberIds);

    // 4. Create Tasks
    console.log("\n4. Creating tasks...");
    const task1 = await apiRequest("POST", "/tasks", { title: "Design Database Schema", description: "", projectId: project.id });
    const task2 = await apiRequest("POST", "/tasks", { title: "Implement User Endpoints", description: "", projectId: project.id });
    console.log("  - Created:", task1);
    console.log("  - Created:", task2);

    // 5. Assign Task
    console.log("\n5. Assigning a task to Alice...");
    await apiRequest("PUT", `/tasks/${task1.id}/assign`, { assigneeId: user1.id });
    console.log(`  - Task ${task1.id} assigned to user ${user1.id}`);

    // 6. Check Alice's Notifications
    console.log("\n6. Checking Alice's notifications...");
    let aliceNotifications = await apiRequest("GET", `/notifications?userId=${user1.id}`);
    console.log("  - Alice's notifications:", aliceNotifications);

    // 7. Change Task Status
    console.log("\n7. Changing task status...");
    await apiRequest("PUT", `/tasks/${task1.id}/status`, { status: "in-progress" });
    console.log(`  - Task ${task1.id} status changed to in-progress`);
    // Check notifications again
    aliceNotifications = await apiRequest("GET", `/notifications?userId=${user1.id}`);
    console.log("  - Alice's new notifications:", aliceNotifications.slice(1));

    // 8. Add a Comment
    console.log("\n8. Bob adds a comment to Alice's task...");
    const comment = await apiRequest("POST", "/comments", { taskId: task1.id, authorId: user2.id, body: "How is it going?" });
    console.log("  - Comment created:", comment);

    // 9. Check Alice's Notifications again for the comment
    console.log("\n9. Checking Alice's notifications for the comment...");
    aliceNotifications = await apiRequest("GET", `/notifications?userId=${user1.id}`);
    console.log("  - Alice's new notifications:", aliceNotifications.slice(2));
    
    // 10. Mark a notification as read
    console.log("\n10. Alice marks a notification as read...");
    const notificationToRead = aliceNotifications[0];
    await apiRequest("PUT", `/notifications/${notificationToRead.id}/read`);
    const finalNotifications = await apiRequest("GET", `/notifications?userId=${user1.id}`);
    console.log("  - Alice's final unread notifications count:", finalNotifications.length);

    console.log("\n--- Demo Complete ---");
    console.log("You can now stop the server with Ctrl+C");
}

// Make sure the server is running before executing this script.
runDemo().catch(err => {
    console.error("\n--- Demo Failed ---");
    console.error(err);
    process.exit(1);
});
