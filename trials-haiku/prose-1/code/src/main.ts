/**
 * Main entry point - Server setup and initialization
 */

import { createServer } from 'http';
import { apiRouter } from './api-router';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  apiRouter.handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`Task Management API server listening on port ${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/users`);
});
