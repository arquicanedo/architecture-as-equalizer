// Demo script - Exercises all features of the Task Management API
import { Router } from "./router";
import { userService } from "./services/user-service";
import { projectService } from "./services/project-service";
import { taskService } from "./services/task-service";
import { commentService } from "./services/comment-service";
import { notificationService } from "./services/notification-service";

const PORT = 3000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const http = require("http");

    const options = {
      hostname: "localhost",
      port: PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res: any) => {
      let data = "";
      res.on("data", (chunk: string) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDemo(): Promise<void> {
  console.log("🚀 Starting Task Management API Server...\n");

  const router = new Router();
  router.listen(PORT);

  // Wait for server to start
  await sleep(500);

  try {
    console.log("📝 DEMO: Task Management API\n");
    console.log("=".repeat(60));

    // 1. Create Users
    console.log("\n1️⃣  Creating Users...");
    const alice = await makeRequest("POST", "/users", {
      name: "Alice",
      email: "alice@example.com",
    });
    console.log(`   ✓ Created user: ${alice.name} (${alice.id})`);

    const bob = await makeRequest("POST", "/users", {
      name: "Bob",
      email: "bob@example.com",
    });
    console.log(`   ✓ Created user: ${bob.name} (${bob.id})`);

    const charlie = await makeRequest("POST", "/users", {
      name: "Charlie",
      email: "charlie@example.com",
    });
    console.log(`   ✓ Created user: ${charlie.name} (${charlie.id})`);

    // 2. Create Project
    console.log("\n2️⃣  Creating Project...");
    const project = await makeRequest("POST", "/projects", {
      name: "Website Redesign",
      description: "Redesign the company website",
    });
    console.log(`   ✓ Created project: ${project.name} (${project.id})`);

    // 3. Add Members to Project
    console.log("\n3️⃣  Adding Members to Project...");
    await makeRequest("POST", `/projects/${project.id}/members`, {
      userId: alice.id,
    });
    console.log(`   ✓ Added Alice to project`);

    await makeRequest("POST", `/projects/${project.id}/members`, {
      userId: bob.id,
    });
    console.log(`   ✓ Added Bob to project`);

    await makeRequest("POST", `/projects/${project.id}/members`, {
      userId: charlie.id,
    });
    console.log(`   ✓ Added Charlie to project`);

    // 4. Create Tasks
    console.log("\n4️⃣  Creating Tasks...");
    const task1 = await makeRequest("POST", "/tasks", {
      title: "Design wireframes",
      description: "Create wireframes for the new homepage",
      projectId: project.id,
    });
    console.log(`   ✓ Created task: ${task1.title} (${task1.id})`);

    const task2 = await makeRequest("POST", "/tasks", {
      title: "Implement header component",
      description: "Build the reusable header component",
      projectId: project.id,
    });
    console.log(`   ✓ Created task: ${task2.title} (${task2.id})`);

    const task3 = await makeRequest("POST", "/tasks", {
      title: "Set up database schema",
      description: "Define database tables and relationships",
      projectId: project.id,
    });
    console.log(`   ✓ Created task: ${task3.title} (${task3.id})`);

    // 5. Assign Tasks
    console.log("\n5️⃣  Assigning Tasks...");
    await makeRequest("PUT", `/tasks/${task1.id}/assign`, {
      assigneeId: alice.id,
    });
    console.log(`   ✓ Assigned "${task1.title}" to Alice`);
    await sleep(100);

    await makeRequest("PUT", `/tasks/${task2.id}/assign`, {
      assigneeId: bob.id,
    });
    console.log(`   ✓ Assigned "${task2.title}" to Bob`);
    await sleep(100);

    await makeRequest("PUT", `/tasks/${task3.id}/assign`, {
      assigneeId: charlie.id,
    });
    console.log(`   ✓ Assigned "${task3.title}" to Charlie`);
    await sleep(100);

    // 6. Check Notifications (after assignment)
    console.log("\n6️⃣  Checking Notifications After Assignment...");
    const notifAlice = await makeRequest(
      "GET",
      `/notifications?userId=${alice.id}`
    );
    console.log(`   ✓ Alice has ${notifAlice.length} notification(s)`);
    if (notifAlice.length > 0) {
      console.log(`     Message: "${notifAlice[0].message}"`);
    }

    // 7. Change Task Status
    console.log("\n7️⃣  Changing Task Status...");
    const task1InProgress = await makeRequest(
      "PUT",
      `/tasks/${task1.id}/status`,
      { status: "in-progress" }
    );
    console.log(
      `   ✓ Task "${task1.title}" status: ${task1InProgress.status}`
    );
    await sleep(100);

    const task1Done = await makeRequest(`PUT`, `/tasks/${task1.id}/status`, {
      status: "done",
    });
    console.log(`   ✓ Task "${task1.title}" status: ${task1Done.status}`);
    await sleep(100);

    // 8. Check Notifications (after status change)
    console.log("\n8️⃣  Checking Notifications After Status Change...");
    const notifAliceAfterStatus = await makeRequest(
      "GET",
      `/notifications?userId=${alice.id}`
    );
    console.log(
      `   ✓ Alice now has ${notifAliceAfterStatus.length} notification(s)`
    );
    notifAliceAfterStatus.forEach((notif: any, i: number) => {
      console.log(`     [${i + 1}] ${notif.message}`);
    });

    // 9. Add Comments
    console.log("\n9️⃣  Adding Comments to Task...");
    const comment1 = await makeRequest("POST", "/comments", {
      taskId: task2.id,
      authorId: bob.id,
      body: "I've started working on the header component. Should be done by end of day.",
    });
    console.log(`   ✓ Comment added by ${bob.name}`);
    await sleep(100);

    const comment2 = await makeRequest("POST", "/comments", {
      taskId: task2.id,
      authorId: alice.id,
      body: "Looks good! Let me review the code once you push.",
    });
    console.log(`   ✓ Comment added by ${alice.name}`);
    await sleep(100);

    // 10. Get Comments on Task
    console.log("\n🔟 Getting Comments on Task...");
    const comments = await makeRequest("GET", `/comments?taskId=${task2.id}`);
    console.log(`   ✓ Found ${comments.length} comment(s) on task`);
    comments.forEach((comment: any, i: number) => {
      const author = comment.authorId === alice.id ? alice.name : bob.name;
      console.log(`     [${i + 1}] ${author}: "${comment.body}"`);
    });

    // 11. Get Tasks by Project
    console.log("\n1️⃣1️⃣  Getting Tasks in Project...");
    const projectTasks = await makeRequest(
      "GET",
      `/tasks?projectId=${project.id}`
    );
    console.log(`   ✓ Found ${projectTasks.length} task(s) in project`);
    projectTasks.forEach((task: any) => {
      console.log(
        `     • ${task.title} [${task.status}] - Assignee: ${task.assigneeId ? "assigned" : "unassigned"}`
      );
    });

    // 12. Get all users with full data
    console.log("\n1️⃣2️⃣  Getting All Users...");
    const allUsers = await makeRequest("GET", "/users");
    console.log(`   ✓ Found ${allUsers.length} user(s)`);
    allUsers.forEach((user: any) => {
      console.log(`     • ${user.name} <${user.email}>`);
    });

    // 13. Test Forward-Only Status Transitions
    console.log("\n1️⃣3️⃣  Testing Forward-Only Status Transitions...");
    try {
      await makeRequest("PUT", `/tasks/${task3.id}/status`, {
        status: "in-progress",
      });
      console.log(`   ✓ Task moved to in-progress`);

      await makeRequest("PUT", `/tasks/${task3.id}/status`, {
        status: "todo",
      });
      console.log(`   ✗ ERROR: Should not allow backward transition!`);
    } catch (error) {
      console.log(`   ✓ Backward transition correctly rejected`);
    }

    // 14. Mark notification as read
    console.log("\n1️⃣4️⃣  Marking Notification as Read...");
    if (notifAliceAfterStatus.length > 0) {
      const updatedNotif = await makeRequest(
        "PUT",
        `/notifications/${notifAliceAfterStatus[0].id}/read`,
        {}
      );
      console.log(`   ✓ Notification marked as ${updatedNotif.read ? "read" : "unread"}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Demo completed successfully!\n");

    // Close the server
    router.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Demo failed:", error);
    router.close();
    process.exit(1);
  }
}

// Run the demo
runDemo().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
