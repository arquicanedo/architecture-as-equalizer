/**
 * Demo script
 * Tests the complete Task Management API workflow
 */

import { createServer } from "http";
import * as http from "http";
import { URL } from "url";
import { router } from "./router.js";

const PORT = 3000;

/**
 * Make an HTTP request
 */
function request(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${PORT}`);

    const options = {
      hostname: "localhost",
      port: PORT,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res: any) => {
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
            data: data,
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

/**
 * Demo execution
 */
async function runDemo() {
  const server = createServer(router);

  return new Promise<void>((resolve) => {
    server.listen(PORT, async () => {
      console.log("=".repeat(60));
      console.log("Task Management API - Demo");
      console.log("=".repeat(60));
      console.log();

      try {
        // Create users
        console.log("📝 Creating users...");
        const alice = await request("POST", "/users", {
          name: "Alice",
          email: "alice@example.com",
        });
        const aliceId = alice.data.id;
        console.log(`✓ Created user: ${alice.data.name} (${aliceId})`);

        const bob = await request("POST", "/users", {
          name: "Bob",
          email: "bob@example.com",
        });
        const bobId = bob.data.id;
        console.log(`✓ Created user: ${bob.data.name} (${bobId})`);

        const charlie = await request("POST", "/users", {
          name: "Charlie",
          email: "charlie@example.com",
        });
        const charlieId = charlie.data.id;
        console.log(`✓ Created user: ${charlie.data.name} (${charlieId})`);

        console.log();

        // Create project
        console.log("📋 Creating project...");
        const project = await request("POST", "/projects", {
          name: "Website Redesign",
          description: "Complete website redesign project",
        });
        const projectId = project.data.id;
        console.log(`✓ Created project: ${project.data.name} (${projectId})`);

        console.log();

        // Add members to project
        console.log("👥 Adding members to project...");
        await request("POST", `/projects/${projectId}/members`, {
          userId: aliceId,
        });
        console.log(`✓ Added Alice to project`);

        await request("POST", `/projects/${projectId}/members`, {
          userId: bobId,
        });
        console.log(`✓ Added Bob to project`);

        await request("POST", `/projects/${projectId}/members`, {
          userId: charlieId,
        });
        console.log(`✓ Added Charlie to project`);

        console.log();

        // Create tasks
        console.log("✅ Creating tasks...");
        const task1 = await request("POST", "/tasks", {
          title: "Design Homepage",
          description: "Create mockups for the new homepage",
          projectId: projectId,
        });
        const task1Id = task1.data.id;
        console.log(
          `✓ Created task: "${task1.data.title}" (${task1Id}, status: ${task1.data.status})`
        );

        const task2 = await request("POST", "/tasks", {
          title: "Build Navigation",
          description: "Implement the new navigation structure",
          projectId: projectId,
        });
        const task2Id = task2.data.id;
        console.log(
          `✓ Created task: "${task2.data.title}" (${task2Id}, status: ${task2.data.status})`
        );

        const task3 = await request("POST", "/tasks", {
          title: "Setup Database",
          description: "Configure and initialize the database",
          projectId: projectId,
        });
        const task3Id = task3.data.id;
        console.log(
          `✓ Created task: "${task3.data.title}" (${task3Id}, status: ${task3.data.status})`
        );

        console.log();

        // Assign tasks
        console.log("🔗 Assigning tasks...");
        await request("PUT", `/tasks/${task1Id}/assign`, {
          assigneeId: aliceId,
        });
        console.log(`✓ Assigned "${task1.data.title}" to Alice`);

        await request("PUT", `/tasks/${task2Id}/assign`, {
          assigneeId: bobId,
        });
        console.log(`✓ Assigned "${task2.data.title}" to Bob`);

        await request("PUT", `/tasks/${task3Id}/assign`, {
          assigneeId: charlieId,
        });
        console.log(`✓ Assigned "${task3.data.title}" to Charlie`);

        console.log();

        // Check notifications after assignments
        console.log("📬 Checking Alice's notifications...");
        const notifs1 = await request("GET", `/notifications?userId=${aliceId}`);
        console.log(`✓ Alice has ${notifs1.data.length} notification(s)`);
        if (notifs1.data.length > 0) {
          console.log(`  - ${notifs1.data[0].message}`);
        }

        console.log();

        // Change task status
        console.log("🔄 Updating task status...");
        const updated1 = await request("PUT", `/tasks/${task1Id}/status`, {
          newStatus: "in-progress",
        });
        console.log(
          `✓ "${task1.data.title}" status: ${updated1.data.status}`
        );

        const updated2 = await request("PUT", `/tasks/${task1Id}/status`, {
          newStatus: "done",
        });
        console.log(
          `✓ "${task1.data.title}" status: ${updated2.data.status}`
        );

        console.log();

        // Check Alice's notifications again
        console.log("📬 Checking Alice's notifications again...");
        const notifs2 = await request("GET", `/notifications?userId=${aliceId}`);
        console.log(`✓ Alice has ${notifs2.data.length} notification(s)`);
        notifs2.data.forEach((n: any, i: number) => {
          console.log(`  ${i + 1}. ${n.message}`);
        });

        console.log();

        // Add comments
        console.log("💬 Adding comments to tasks...");
        const comment1 = await request("POST", "/comments", {
          taskId: task1Id,
          authorId: bobId,
          body: "Great design mockups! Let me review them.",
        });
        console.log(`✓ Bob commented on "${task1.data.title}"`);

        const comment2 = await request("POST", "/comments", {
          taskId: task1Id,
          authorId: charlieId,
          body: "Looks good to me. Ready to implement!",
        });
        console.log(`✓ Charlie commented on "${task1.data.title}"`);

        console.log();

        // Get all comments on task
        console.log("💬 Retrieving comments for task...");
        const comments = await request("GET", `/comments?taskId=${task1Id}`);
        console.log(`✓ Found ${comments.data.length} comment(s):`);
        comments.data.forEach((c: any, i: number) => {
          console.log(`  ${i + 1}. ${c.body}`);
        });

        console.log();

        // Get project tasks
        console.log("📋 Retrieving project tasks...");
        const tasks = await request("GET", `/tasks?projectId=${projectId}`);
        console.log(
          `✓ Project has ${tasks.data.length} task(s):`
        );
        tasks.data.forEach((t: any) => {
          console.log(`  - ${t.title} [${t.status}]`);
        });

        console.log();

        // Get all users
        console.log("👥 Retrieving all users...");
        const users = await request("GET", "/users");
        console.log(`✓ Found ${users.data.length} user(s)`);

        console.log();

        // Mark notification as read
        console.log("📬 Marking notification as read...");
        if (notifs2.data.length > 0) {
          const notifId = notifs2.data[0].id;
          const marked = await request("PUT", `/notifications/${notifId}/read`, {});
          console.log(`✓ Marked notification as read`);
        }

        console.log();
        console.log("=".repeat(60));
        console.log("✨ Demo completed successfully!");
        console.log("=".repeat(60));
      } catch (error) {
        console.error("❌ Demo error:", error);
      } finally {
        server.close(() => {
          resolve();
        });
      }
    });
  });
}

// Run the demo
runDemo().catch(console.error);
