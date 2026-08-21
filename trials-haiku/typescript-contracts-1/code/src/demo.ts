import Application from "./main";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://localhost:3000");
    const options = {
      hostname: "localhost",
      port: 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = require("http").request(options, (res: any) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
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
  console.log("=== Task Management API Demo ===\n");

  // Start server
  const app = new Application();
  app.start(3000);

  // Wait for server to start
  await sleep(1000);

  try {
    // 1. Create users
    console.log("1. Creating users...");
    const user1Response = (await makeRequest("POST", "/users", {
      name: "Alice Johnson",
      email: "alice@example.com",
    })) as any;
    const user1Id = user1Response.id;
    console.log(`   Created user: ${user1Response.name} (${user1Id})`);

    const user2Response = (await makeRequest("POST", "/users", {
      name: "Bob Smith",
      email: "bob@example.com",
    })) as any;
    const user2Id = user2Response.id;
    console.log(`   Created user: ${user2Response.name} (${user2Id})`);

    // 2. Create project
    console.log("\n2. Creating project...");
    const projectResponse = (await makeRequest("POST", "/projects", {
      name: "Q1 Website Redesign",
      description: "Redesign company website for Q1 2024",
    })) as any;
    const projectId = projectResponse.id;
    console.log(`   Created project: ${projectResponse.name} (${projectId})`);

    // 3. Add members to project
    console.log("\n3. Adding members to project...");
    await makeRequest("POST", `/projects/${projectId}/members`, {
      userId: user1Id,
    });
    console.log(`   Added Alice to project`);

    await makeRequest("POST", `/projects/${projectId}/members`, {
      userId: user2Id,
    });
    console.log(`   Added Bob to project`);

    // 4. Create tasks
    console.log("\n4. Creating tasks...");
    const task1Response = (await makeRequest("POST", "/tasks", {
      title: "Design homepage mockup",
      description: "Create initial mockup for new homepage",
      projectId: projectId,
    })) as any;
    const task1Id = task1Response.id;
    console.log(`   Created task: ${task1Response.title} (${task1Id})`);

    const task2Response = (await makeRequest("POST", "/tasks", {
      title: "Implement backend API",
      description: "Build REST API endpoints",
      projectId: projectId,
    })) as any;
    const task2Id = task2Response.id;
    console.log(`   Created task: ${task2Response.title} (${task2Id})`);

    // 5. Assign tasks
    console.log("\n5. Assigning tasks...");
    await makeRequest("PUT", `/tasks/${task1Id}/assign`, {
      assigneeId: user1Id,
    });
    console.log(`   Assigned task 1 to Alice`);

    await makeRequest("PUT", `/tasks/${task2Id}/assign`, {
      assigneeId: user2Id,
    });
    console.log(`   Assigned task 2 to Bob`);

    // 6. Add comments
    console.log("\n6. Adding comments...");
    const comment1Response = (await makeRequest("POST", "/comments", {
      taskId: task1Id,
      authorId: user2Id,
      body: "Great mockup! A few suggestions: try rounded corners and more whitespace.",
    })) as any;
    console.log(`   Added comment by ${user2Response.name} to task 1`);

    // 7. Change task status
    console.log("\n7. Changing task status...");
    const statusUpdate1 = (await makeRequest("PUT", `/tasks/${task1Id}/status`, {
      status: "in-progress",
    })) as any;
    console.log(`   Changed task 1 status to: ${statusUpdate1.status}`);

    const statusUpdate2 = (await makeRequest("PUT", `/tasks/${task1Id}/status`, {
      status: "done",
    })) as any;
    console.log(`   Changed task 1 status to: ${statusUpdate2.status}`);

    // 8. Get notifications
    console.log("\n8. Checking notifications...");

    const aliceNotifications = (await makeRequest("GET", `/notifications?userId=${user1Id}`)) as any;
    console.log(`   Alice has ${aliceNotifications.length} notifications:`);
    aliceNotifications.forEach((notif: any) => {
      console.log(`     - ${notif.message}`);
    });

    const bobNotifications = (await makeRequest("GET", `/notifications?userId=${user2Id}`)) as any;
    console.log(`   Bob has ${bobNotifications.length} notifications:`);
    bobNotifications.forEach((notif: any) => {
      console.log(`     - ${notif.message}`);
    });

    // 9. Get project tasks
    console.log("\n9. Getting all project tasks...");
    const projectTasks = (await makeRequest(
      "GET",
      `/tasks?projectId=${projectId}`
    )) as any;
    console.log(`   Project has ${projectTasks.length} tasks:`);
    projectTasks.forEach((task: any) => {
      console.log(`     - [${task.status}] ${task.title}`);
    });

    // 10. Get all users
    console.log("\n10. Getting all users...");
    const allUsers = (await makeRequest("GET", "/users")) as any;
    console.log(`   Total users in system: ${allUsers.length}`);
    allUsers.forEach((user: any) => {
      console.log(`     - ${user.name} (${user.email})`);
    });

    console.log("\n=== Demo completed successfully! ===\n");
  } catch (error) {
    console.error("Demo error:", error);
  }

  // Exit after demo
  process.exit(0);
}

runDemo().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
