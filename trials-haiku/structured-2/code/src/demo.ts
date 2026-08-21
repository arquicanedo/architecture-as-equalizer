/**
 * Demo Script - Exercises all features of the Task Management API
 * Runs through: create users → create project → add members → create tasks →
 * assign tasks → change status → add comments → check notifications
 */

import { start } from "./main.js";
import { Server } from "http";
import { request as httpRequest } from "http";
import { URL } from "url";

const BASE_URL = "http://localhost:3000";

/**
 * Make HTTP request helper
 */
async function request(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = httpRequest(options, (res: any) => {
      let data = "";

      res.on("data", (chunk: any) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const result = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: result });
        } catch (error) {
          resolve({ status: res.statusCode, body: data });
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

/**
 * Demo function
 */
async function runDemo() {
  console.log("🚀 Starting Task Management API Demo...\n");

  let server: Server | null = null;

  try {
    // Start server
    server = await start();

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Create users
    console.log("📝 Creating users...");
    const user1Res = await request("POST", "/users", {
      name: "Alice Johnson",
      email: "alice@example.com",
    });
    const user1 = user1Res.body;
    console.log(`✓ Created user: ${user1.name} (${user1.id})\n`);

    const user2Res = await request("POST", "/users", {
      name: "Bob Smith",
      email: "bob@example.com",
    });
    const user2 = user2Res.body;
    console.log(`✓ Created user: ${user2.name} (${user2.id})\n`);

    const user3Res = await request("POST", "/users", {
      name: "Carol Davis",
      email: "carol@example.com",
    });
    const user3 = user3Res.body;
    console.log(`✓ Created user: ${user3.name} (${user3.id})\n`);

    // 2. Create project
    console.log("🏗️  Creating project...");
    const projRes = await request("POST", "/projects", {
      name: "Website Redesign",
      description: "Complete redesign of the company website",
    });
    const project = projRes.body;
    console.log(`✓ Created project: ${project.name} (${project.id})\n`);

    // 3. Add members to project
    console.log("👥 Adding members to project...");
    await request("POST", `/projects/${project.id}/members`, {
      userId: user1.id,
    });
    console.log(`✓ Added ${user1.name} to project`);

    await request("POST", `/projects/${project.id}/members`, {
      userId: user2.id,
    });
    console.log(`✓ Added ${user2.name} to project`);

    await request("POST", `/projects/${project.id}/members`, {
      userId: user3.id,
    });
    console.log(`✓ Added ${user3.name} to project\n`);

    // 4. Create tasks
    console.log("📋 Creating tasks...");
    const task1Res = await request("POST", "/tasks", {
      title: "Design mockups",
      description: "Create UI mockups for the new design",
      projectId: project.id,
    });
    const task1 = task1Res.body;
    console.log(`✓ Created task: ${task1.title} (${task1.id})`);

    const task2Res = await request("POST", "/tasks", {
      title: "Backend API",
      description: "Implement REST API endpoints",
      projectId: project.id,
    });
    const task2 = task2Res.body;
    console.log(`✓ Created task: ${task2.title} (${task2.id})`);

    const task3Res = await request("POST", "/tasks", {
      title: "Frontend implementation",
      description: "Build React components",
      projectId: project.id,
    });
    const task3 = task3Res.body;
    console.log(`✓ Created task: ${task3.title} (${task3.id})\n`);

    // 5. Assign tasks
    console.log("🎯 Assigning tasks...");
    await request("PUT", `/tasks/${task1.id}/assign`, {
      assigneeId: user1.id,
    });
    console.log(`✓ Assigned "${task1.title}" to ${user1.name}`);

    await request("PUT", `/tasks/${task2.id}/assign`, {
      assigneeId: user2.id,
    });
    console.log(`✓ Assigned "${task2.title}" to ${user2.name}`);

    await request("PUT", `/tasks/${task3.id}/assign`, {
      assigneeId: user3.id,
    });
    console.log(`✓ Assigned "${task3.title}" to ${user3.name}\n`);

    // 6. Change task status
    console.log("⚡ Changing task statuses...");
    await request("PUT", `/tasks/${task1.id}/status`, {
      status: "in-progress",
    });
    console.log(
      `✓ Changed "${task1.title}" status to in-progress`
    );

    await request("PUT", `/tasks/${task1.id}/status`, {
      status: "done",
    });
    console.log(
      `✓ Changed "${task1.title}" status to done`
    );

    await request("PUT", `/tasks/${task2.id}/status`, {
      status: "in-progress",
    });
    console.log(
      `✓ Changed "${task2.title}" status to in-progress\n`
    );

    // 7. Add comments
    console.log("💬 Adding comments...");
    const comment1Res = await request("POST", "/comments", {
      taskId: task1.id,
      authorId: user1.id,
      authorName: user1.name,
      body: "I've completed the mockups and uploaded them to the design folder.",
      taskTitle: task1.title,
    });
    const comment1 = comment1Res.body;
    console.log(`✓ ${user1.name} commented on "${task1.title}"`);

    const comment2Res = await request("POST", "/comments", {
      taskId: task2.id,
      authorId: user2.id,
      authorName: user2.name,
      body: "I've set up the database schema. Ready to start implementing endpoints.",
      taskTitle: task2.title,
    });
    const comment2 = comment2Res.body;
    console.log(`✓ ${user2.name} commented on "${task2.title}"\n`);

    // 8. Check notifications
    console.log("🔔 Checking notifications...");

    const notif1Res = await request("GET", `/notifications?userId=${user1.id}`);
    const notif1 = notif1Res.body;
    console.log(`✓ ${user1.name} has ${notif1.length} notifications:`);
    notif1.forEach((n: any) => {
      console.log(`  - ${n.message} (${n.read ? "read" : "unread"})`);
    });

    const notif2Res = await request("GET", `/notifications?userId=${user2.id}`);
    const notif2 = notif2Res.body;
    console.log(`\n✓ ${user2.name} has ${notif2.length} notifications:`);
    notif2.forEach((n: any) => {
      console.log(`  - ${n.message} (${n.read ? "read" : "unread"})`);
    });

    const notif3Res = await request("GET", `/notifications?userId=${user3.id}`);
    const notif3 = notif3Res.body;
    console.log(`\n✓ ${user3.name} has ${notif3.length} notifications:`);
    notif3.forEach((n: any) => {
      console.log(`  - ${n.message} (${n.read ? "read" : "unread"})`);
    });

    // 9. Mark notification as read
    console.log(`\n📖 Marking a notification as read...`);
    if (notif1.length > 0) {
      await request("PUT", `/notifications/${notif1[0].id}/read`, {});
      console.log(`✓ Marked notification as read\n`);
    }

    // 10. Verify data consistency
    console.log("🔍 Verifying data consistency...");

    const usersRes = await request("GET", "/users");
    const allUsers = usersRes.body;
    console.log(`✓ Total users: ${allUsers.length}`);

    const projectsRes = await request("GET", "/projects");
    const allProjects = projectsRes.body;
    console.log(`✓ Total projects: ${allProjects.length}`);

    const tasksRes = await request("GET", "/tasks");
    const allTasks = tasksRes.body;
    console.log(`✓ Total tasks: ${allTasks.length}`);

    const commentsRes = await request("GET", `/comments?taskId=${task1.id}`);
    const taskComments = commentsRes.body;
    console.log(`✓ Comments on task "${task1.title}": ${taskComments.length}\n`);

    console.log("✅ Demo completed successfully!\n");
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    // Close server
    if (server) {
      server.close(() => {
        console.log("🛑 Server stopped");
        process.exit(0);
      });
    }
  }
}

// Run demo
runDemo().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
