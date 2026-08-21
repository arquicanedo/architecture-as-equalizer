// ============================================================
// Demo Script — End-to-End Flow Testing
// ============================================================

import { Application } from "./main.js";
import * as http from "http";

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
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
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
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
  console.log("\n=== Task Management API Demo ===\n");

  // Start server
  const app = new Application();
  app.start(3000);

  // Give server time to start
  await sleep(500);

  try {
    console.log("1. Creating users...");
    const user1Response: any = await makeRequest("POST", "/users", {
      name: "Alice Johnson",
      email: "alice@example.com",
    });
    const user1 = user1Response;
    console.log(`   Created user: ${user1.name} (${user1.id})`);

    const user2Response: any = await makeRequest("POST", "/users", {
      name: "Bob Smith",
      email: "bob@example.com",
    });
    const user2 = user2Response;
    console.log(`   Created user: ${user2.name} (${user2.id})`);

    const user3Response: any = await makeRequest("POST", "/users", {
      name: "Carol White",
      email: "carol@example.com",
    });
    const user3 = user3Response;
    console.log(`   Created user: ${user3.name} (${user3.id})`);

    console.log("\n2. Creating project...");
    const projectResponse: any = await makeRequest("POST", "/projects", {
      name: "Website Redesign",
      description: "Complete redesign of company website",
    });
    const project = projectResponse;
    console.log(`   Created project: ${project.name} (${project.id})`);

    console.log("\n3. Adding members to project...");
    await makeRequest("POST", `/projects/${project.id}/members`, {
      userId: user1.id,
    });
    console.log(`   Added ${user1.name} to project`);

    await makeRequest("POST", `/projects/${project.id}/members`, {
      userId: user2.id,
    });
    console.log(`   Added ${user2.name} to project`);

    console.log("\n4. Creating tasks...");
    const task1Response: any = await makeRequest("POST", "/tasks", {
      title: "Design mockups",
      description: "Create initial design mockups for new layout",
      projectId: project.id,
    });
    const task1 = task1Response;
    console.log(`   Created task: ${task1.title} (${task1.id})`);

    const task2Response: any = await makeRequest("POST", "/tasks", {
      title: "Implement frontend",
      description: "Code the frontend components",
      projectId: project.id,
    });
    const task2 = task2Response;
    console.log(`   Created task: ${task2.title} (${task2.id})`);

    console.log("\n5. Assigning tasks...");
    const assignedTask1: any = await makeRequest("PUT", `/tasks/${task1.id}/assign`, {
      assigneeId: user1.id,
    });
    console.log(`   Assigned '${assignedTask1.title}' to ${user1.name}`);

    const assignedTask2: any = await makeRequest("PUT", `/tasks/${task2.id}/assign`, {
      assigneeId: user2.id,
    });
    console.log(`   Assigned '${assignedTask2.title}' to ${user2.name}`);

    // Give time for notifications to be created
    await sleep(100);

    console.log("\n6. Checking notifications for users...");
    const user1Notifs: any = await makeRequest("GET", `/notifications?userId=${user1.id}`);
    console.log(`   ${user1.name} has ${user1Notifs.length} notification(s)`);
    if (user1Notifs.length > 0) {
      console.log(`      - ${user1Notifs[0].message}`);
    }

    const user2Notifs: any = await makeRequest("GET", `/notifications?userId=${user2.id}`);
    console.log(`   ${user2.name} has ${user2Notifs.length} notification(s)`);
    if (user2Notifs.length > 0) {
      console.log(`      - ${user2Notifs[0].message}`);
    }

    console.log("\n7. Changing task statuses...");
    const statusChangedTask1: any = await makeRequest("PUT", `/tasks/${task1.id}/status`, {
      status: "in-progress",
    });
    console.log(`   '${statusChangedTask1.title}' → in-progress`);

    // Give time for notification
    await sleep(100);

    const statusChangedTask2: any = await makeRequest("PUT", `/tasks/${statusChangedTask1.id}/status`, {
      status: "done",
    });
    console.log(`   '${statusChangedTask2.title}' → done`);

    // Give time for notification
    await sleep(100);

    console.log("\n8. Checking updated notifications...");
    const user1NotificsUpdated: any = await makeRequest("GET", `/notifications?userId=${user1.id}`);
    console.log(`   ${user1.name} now has ${user1NotificsUpdated.length} notification(s)`);
    user1NotificsUpdated.slice(0, 2).forEach((notif: any, idx: number) => {
      console.log(`      ${idx + 1}. ${notif.message}`);
    });

    console.log("\n9. Adding comments to tasks...");
    const commentResponse: any = await makeRequest("POST", "/comments", {
      taskId: task2.id,
      authorId: user1.id,
      body: "I've started reviewing the design. Looking good so far!",
    });
    const comment = commentResponse;
    console.log(`   ${user1.name} commented on '${task2.title}'`);
    console.log(`      "${comment.body}"`);

    // Give time for notification
    await sleep(100);

    console.log("\n10. Checking notifications for task assignee (User 2)...");
    const user2NotificsWithComment: any = await makeRequest("GET", `/notifications?userId=${user2.id}`);
    console.log(`   ${user2.name} has ${user2NotificsWithComment.length} notification(s)`);
    const lastNotif = user2NotificsWithComment.slice(-1)[0];
    if (lastNotif) {
      console.log(`      Latest: ${lastNotif.message}`);
    }

    console.log("\n11. Getting all tasks for project...");
    const allTasks: any = await makeRequest("GET", `/tasks?projectId=${project.id}`);
    console.log(`   Project has ${allTasks.length} tasks:`);
    allTasks.forEach((task: any) => {
      console.log(`      - ${task.title} [${task.status}] (assigned to: ${task.assigneeId ? "user" : "unassigned"})`);
    });

    console.log("\n12. Getting all comments for a task...");
    const taskComments: any = await makeRequest("GET", `/comments?taskId=${task2.id}`);
    console.log(`   '${task2.title}' has ${taskComments.length} comment(s)`);

    console.log("\n13. Marking notifications as read...");
    if (user1NotificsUpdated.length > 0) {
      const notifId = user1NotificsUpdated[0].id;
      const markedRead: any = await makeRequest("PUT", `/notifications/${notifId}/read`, {});
      console.log(`   Marked notification as read: ${markedRead.read}`);
    }

    console.log("\n14. Testing invalid status transition...");
    try {
      // Try to go from in-progress back to todo (invalid)
      const task3Response: any = await makeRequest("POST", "/tasks", {
        title: "Test task",
        description: "For testing status transitions",
        projectId: project.id,
      });
      const task3 = task3Response;
      
      await makeRequest("PUT", `/tasks/${task3.id}/status`, {
        status: "in-progress",
      });
      
      // This should fail
      const invalidStatus: any = await makeRequest("PUT", `/tasks/${task3.id}/status`, {
        status: "todo",
      });
      
      if (invalidStatus && invalidStatus.error) {
        console.log(`   ✓ Correctly rejected invalid transition: ${invalidStatus.error}`);
      }
    } catch (e) {
      console.log(`   ✓ Correctly rejected invalid transition`);
    }

    console.log("\n=== Demo Complete ===\n");
  } catch (error) {
    console.error("Demo error:", error);
  } finally {
    app.stop();
    process.exit(0);
  }
}

runDemo().catch(console.error);
