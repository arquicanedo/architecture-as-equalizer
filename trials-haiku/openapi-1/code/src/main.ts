/**
 * Main Entry Point
 * Starts the HTTP server and initializes all services.
 */

import { createServer } from 'http';
import { router } from './router';
import { notificationService } from './services/notification-service';

const PORT = process.env.PORT || 3000;

// Initialize services (this loads the notification service which subscribes to events)
console.log('Initializing services...');

const server = createServer(async (req, res) => {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  await router.handle(req, res);
});

server.listen(PORT as number, () => {
  console.log(`✓ Task Management API listening on http://localhost:${PORT}`);
  console.log(`  - Users: http://localhost:${PORT}/users`);
  console.log(`  - Projects: http://localhost:${PORT}/projects`);
  console.log(`  - Tasks: http://localhost:${PORT}/tasks?projectId=<id>`);
  console.log(`  - Comments: http://localhost:${PORT}/comments?taskId=<id>`);
  console.log(`  - Notifications: http://localhost:${PORT}/notifications?userId=<id>`);
});

export { server };
