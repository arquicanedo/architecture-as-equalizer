/**
 * Demo Script
 * Demonstrates the full workflow of the Task Management API
 */

import { createServer } from "http";
import { handleRequest } from "./router";

const PORT = 3000;

interface ApiResponse {
  status: number;
  data: any;
}

async function apiCall(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${PORT}`);
    const options = {
      hostname: url.hostname,
      port: url.port || PORT,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = require("http").request(options, (res: any) => {
      let data = "";
      res.on("data", (chunk: any) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: { error: data },
          });
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
  console.log("🚀 Starting Task Management API Demo\n");

  // Start the server
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    await handleRequest(req, res);
  });

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`✓ Server started on http://localhost:${PORT}\n`);
      resolve();
    });
  });

  try {
    // 1. Create users
    console.log("📝 Step 1: Creating users...");
    const user1Resp = await apiCall("POST", "/users", {
      name: "Alice Johnson",
      email: "alice@example.com",
    });
    const user1 = user1Resp.data.user;
    console.log(`  ✓ Created user: ${user1.name} (${user1.id})`);

    const user2Resp = await apiCall("POST", "/users", {
      name: "Bob Smith",
      email: "bob@example.com",
    });
    const user2 = user2Resp.data.user;
    console.log(`  ✓ Created user: ${user2.name} (${user2.id})`);

    const user3Resp = await apiCall("POST", "/users", {
      name: "Charlie Brown",
      email: "charlie@example.com",
    });
    const user3 = user3Resp.data.user;
    console.log(`  ✓ Created user: ${user3.name} (${user3.id})\n`);

    // 2. Create project
    console.log("📁 Step 2: Creating project...");
    const projectResp = await apiCall("POST", "/projects", {
      name: "Website Redesign",
      description: "Complete redesign of company website",
    });
    const project = projectResp.data.project;
    console.log(`  ✓ Created project: ${project.name} (${project.id})\n`);

    // 3. Add members to project
    console.log("👥 Step 3: Adding members to project...");
    await apiCall("POST", `/projects/${project.id}/members`, {
      userId: user1.id,
    });
    console.log(`  ✓ Added ${user1.name} to project`);

    await apiCall("POST", `/projects/${project.id}/members`, {
      userId: user2.id,
    });
    console.log(`  ✓ Added ${user2.name} to project`);

    await apiCall("POST", `/projects/${project.id}/members`, {
      userId: user3.id,
    });
    console.log(`  ✓ Added ${user3.name} to project\n`);

    // 4. Create tasks
    console.log("📋 Step 4: Creating tasks...");
    const task1Resp = await apiCall("POST", "/tasks", {
      title: "Design mockups",
      description: "Create wireframes and mockups for homepage",
      projectId: project.id,
    });
    const task1 = task1Resp.data.task;
    console.log(`  ✓ Created task: ${task1.title} (${task1.id})`);

    const task2Resp = await apiCall("POST", "/tasks", {
      title: "Implement frontend",
      description: "Build responsive React components",
      projectId: project.id,
    });
    const task2 = task2Resp.data.task;
    console.log(`  ✓ Created task: ${task2.title} (${task2.id})`);

    const task3Resp = await apiCall("POST", "/tasks", {
      title: "Setup database",
      description: "Configure PostgreSQL and create schema",
      projectId: project.id,
    });
    const task3 = task3Resp.data.task;
    console.log(`  ✓ Created task: ${task3.title} (${task3.id})\n`);

    // 5. Assign tasks
    console.log("🎯 Step 5: Assigning tasks...");
    await apiCall("PUT", `/tasks/${task1.id}/assign`, {
      assigneeId: user1.id,
    });
    console.log(`  ✓ Assigned "${task1.title}" to ${user1.name}`);

    await apiCall("PUT", `/tasks/${task2.id}/assign`, {
      assigneeId: user2.id,
    });
    console.log(`  ✓ Assigned "${task2.title}" to ${user2.name}`);

    await apiCall("PUT", `/tasks/${task3.id}/assign`, {
      assigneeId: user3.id,
    });
    console.log(`  ✓ Assigned "${task3.title}" to ${user3.name}\n`);

    // Small delay to allow notifications to be created
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 6. Check notifications for assigned tasks
    console.log("🔔 Step 6: Checking notifications...");
    const notif1Resp = await apiCall("GET", `/notifications?userId=${user1.id}`);
    console.log(`  ✓ ${user1.name} has ${notif1Resp.data.notifications.length} notifications:`);
    notif1Resp.data.notifications.forEach((n: any) => {
      console.log(`    - ${n.message}`);
    });

    const notif2Resp = await apiCall("GET", `/notifications?userId=${user2.id}`);
    console.log(`  ✓ ${user2.name} has ${notif2Resp.data.notifications.length} notifications`);

    // 7. Change task status
    console.log("\n⏳ Step 7: Changing task status...");
    await apiCall("PUT", `/tasks/${task1.id}/status`, {
      status: "in-progress",
    });
    console.log(`  ✓ Changed "${task1.title}" status to in-progress`);

    await new Promise((resolve) => setTimeout(resolve, 50));

    await apiCall("PUT", `/tasks/${task1.id}/status`, {
      status: "done",
    });
    console.log(`  ✓ Changed "${task1.title}" status to done`);

    // Check updated notifications
    const updatedNotifResp = await apiCall("GET", `/notifications?userId=${user1.id}`);
    console.log(
      `  ✓ ${user1.name} now has ${updatedNotifResp.data.notifications.length} notifications`
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // 8. Add comments
    console.log("\n💬 Step 8: Adding comments...");
    const comment1Resp = await apiCall("POST", "/comments", {
      taskId: task2.id,
      authorId: user3.id,
      body: "Great progress! Need to handle responsive design.",
    });
    const comment1 = comment1Resp.data.comment;
    console.log(`  ✓ ${user3.name} commented on "${task2.title}"`);

    const comment2Resp = await apiCall("POST", "/comments", {
      taskId: task2.id,
      authorId: user1.id,
      body: "Already working on the mobile version.",
    });
    const comment2 = comment2Resp.data.comment;
    console.log(`  ✓ ${user1.name} replied to the comment`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // 9. Check notifications for comments
    console.log("\n🔔 Step 9: Checking notifications after comments...");
    const finalNotifResp = await apiCall("GET", `/notifications?userId=${user2.id}`);
    console.log(`  ✓ ${user2.name} has ${finalNotifResp.data.notifications.length} notifications:`);
    finalNotifResp.data.notifications.forEach((n: any) => {
      console.log(`    - ${n.message}`);
    });

    // 10. Mark notifications as read
    console.log("\n✅ Step 10: Marking notifications as read...");
    if (finalNotifResp.data.notifications.length > 0) {
      const firstNotif = finalNotifResp.data.notifications[0];
      await apiCall("PUT", `/notifications/${firstNotif.id}/read`, {});
      console.log(
        `  ✓ Marked notification "${firstNotif.message}" as read`
      );
    }

    // 11. Get all data
    console.log("\n📊 Step 11: Final summary...");
    const allUsersResp = await apiCall("GET", "/users");
    console.log(`  ✓ Total users: ${allUsersResp.data.users.length}`);

    const allProjectsResp = await apiCall("GET", "/projects");
    console.log(`  ✓ Total projects: ${allProjectsResp.data.projects.length}`);

    const allTasksResp = await apiCall("GET", `/tasks?projectId=${project.id}`);
    console.log(`  ✓ Total tasks in project: ${allTasksResp.data.tasks.length}`);

    const allCommentsResp = await apiCall("GET", `/comments?taskId=${task2.id}`);
    console.log(`  ✓ Comments on "${task2.title}": ${allCommentsResp.data.comments.length}`);

    console.log("\n✨ Demo completed successfully!\n");
  } catch (error) {
    console.error("❌ Error during demo:", error);
  } finally {
    server.close(() => {
      console.log("Server stopped");
      process.exit(0);
    });
  }
}

runDemo();
