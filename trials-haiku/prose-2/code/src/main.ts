/**
 * Main entry point - starts the HTTP server
 */

import { createServer } from 'http';
import { apiRouter } from './api-router.js';
// Import services to ensure they're initialized with event listeners
import { notificationService } from './notification-service.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = createServer(async (req, res) => {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route the request
  await apiRouter.handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`Task Management API server listening on port ${PORT}`);
  console.log(`Server is running at http://localhost:${PORT}`);
});

// Ensure notification service is initialized
notificationService;

export default server;
